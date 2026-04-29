"use client";

import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

let socket: Socket;

export default function LecturerPage() {
  const [systemStatus, setSystemStatus] = useState('PREPARING');
  const [currentQuiz, setCurrentQuiz] = useState<any>(null);
  const [stats, setStats] = useState<any>({ respondentCount: 0, totalStudents: 0, rate: 0, counts: {} });
  const [quizList, setQuizList] = useState<any[]>([]);

  useEffect(() => {
    socket = io();

    // 接続時に問題リストを取得
    socket.emit('get_quiz_list');

    socket.on('status_update', (s: string) => setSystemStatus(s));
    socket.on('quiz_update', (q: any) => setCurrentQuiz(q));
    socket.on('quiz_stats', (s: any) => setStats(s));
    
    // サーバーから届いたリストをステートに保存
    socket.on('quiz_list_res', (list: any[]) => {
      console.log("Received Quiz List:", list);
      setQuizList(list);
    });

    return () => {
      socket.off('status_update');
      socket.off('quiz_update');
      socket.off('quiz_stats');
      socket.off('quiz_list_res');
    };
  }, []);

  // 講義ステータスの切り替え
  const handleStatusChange = (status: string) => {
    socket.emit('change_status', status);
  };

  // クイズの配信開始
  const handleStartQuiz = (q: any) => {
    // サーバーに送る形式を整える（生徒画面の選択肢表示に合わせる）
    const quizData = {
      quiz_id: q.quiz_id,
      question: q.question_text,
      details: {
        "ア": q.option_a,
        "イ": q.option_b,
        "ウ": q.option_c,
        "エ": q.option_d
      },
      options: ["ア", "イ", "ウ", "エ"]
    };
    socket.emit('start_quiz', quizData);
  };

  // クイズの停止
  const handleStopQuiz = () => {
    socket.emit('stop_quiz');
  };

  return (
    <main className="p-4 md:p-8 max-w-6xl mx-auto space-y-8 bg-slate-50 min-h-screen">
      <header className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">LECTURER CONSOLE</h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Live Control Panel</p>
        </div>
        <div className="flex gap-2">
          {['PREPARING', 'ACTIVE', 'ENDED'].map((s) => (
            <button
              key={s}
              onClick={() => handleStatusChange(s)}
              className={`px-4 py-2 rounded-full text-xs font-black transition-all ${
                systemStatus === s 
                ? 'bg-slate-800 text-white shadow-lg scale-105' 
                : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 左・中央：問題リスト配信 */}
        <section className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <h2 className="font-bold mb-6 text-slate-700 flex items-center gap-2">
              <span className="bg-blue-100 text-blue-600 p-2 rounded-lg text-sm">📋</span> 配信問題を選択
            </h2>
            
            <div className="grid gap-4 max-h-[600px] overflow-y-auto pr-2">
              {quizList.length === 0 ? (
                <div className="text-center py-20 border-2 border-dashed rounded-3xl text-slate-300 italic text-sm">
                  問題が登録されていません。管理者画面からインポートしてください。
                </div>
              ) : (
                quizList.map((q) => (
                  <div key={q.quiz_id} className={`p-5 rounded-2xl border-2 transition-all ${currentQuiz?.quiz_id === q.quiz_id ? 'border-blue-500 bg-blue-50' : 'border-gray-50 bg-gray-50'}`}>
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-[10px] font-black bg-white px-2 py-1 rounded-md shadow-sm text-slate-400">{q.category}</span>
                      {currentQuiz?.quiz_id === q.quiz_id ? (
                        <button onClick={handleStopQuiz} className="bg-red-500 text-white px-4 py-1 rounded-full text-[10px] font-bold shadow-md">停止中</button>
                      ) : (
                        <button onClick={() => handleStartQuiz(q)} className="bg-blue-600 text-white px-4 py-1 rounded-full text-[10px] font-bold shadow-md hover:bg-blue-700">配信する</button>
                      )}
                    </div>
                    <p className="font-bold text-slate-700 text-sm leading-relaxed">{q.question_text}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* 右：リアルタイム統計 */}
        <section className="space-y-6">
          <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-2xl sticky top-8">
            <h2 className="text-blue-400 font-bold mb-8 flex items-center gap-2 text-sm uppercase tracking-widest">Live Statistics</h2>
            
            {currentQuiz ? (
              <div className="space-y-8">
                <div className="flex items-end justify-between border-b border-slate-800 pb-6">
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 mb-1 uppercase">Responses</p>
                    <p className="text-4xl font-black text-white">{stats.rate}<span className="text-lg ml-1">%</span></p>
                  </div>
                  <div className="text-right text-slate-400 font-mono text-xs">
                    {stats.respondentCount} / {stats.totalStudents} Students
                  </div>
                </div>

                <div className="space-y-6">
                  {["ア", "イ", "ウ", "エ"].map((opt) => {
                    const count = stats.counts[opt] || 0;
                    const percent = stats.respondentCount > 0 ? Math.round((count / stats.respondentCount) * 100) : 0;
                    return (
                      <div key={opt} className="group">
                        <div className="flex justify-between text-[10px] font-bold mb-2">
                          <span className="text-slate-400 group-hover:text-blue-400 transition-colors">{opt}</span>
                          <span className="text-slate-500">{count} responses ({percent}%)</span>
                        </div>
                        <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden">
                          <div 
                            className="bg-blue-500 h-full rounded-full transition-all duration-1000 ease-out" 
                            style={{ width: `${percent}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="py-20 text-center space-y-4 opacity-30">
                <div className="text-5xl">📊</div>
                <p className="text-xs font-bold tracking-widest uppercase">Waiting for Quiz</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}