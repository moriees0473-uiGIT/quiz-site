"use client";

import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';

let socket: Socket;

export default function StudentPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isRegistered, setIsRegistered] = useState(false);
  const [studentInfo, setStudentInfo] = useState({ studentNumber: '', className: '' });
  const [message, setMessage] = useState(''); // 通知メッセージ用
  const [currentQuiz, setCurrentQuiz] = useState<any>(null);
  const [systemStatus, setSystemStatus] = useState('PREPARING');
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [hasAnswered, setHasAnswered] = useState(false);

  useEffect(() => {
    let myUuid = localStorage.getItem('student_uuid');
    if (!myUuid) {
      myUuid = uuidv4();
      localStorage.setItem('student_uuid', myUuid);
    }

    socket = io({
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    // 初期化：サーバーに自分のUUIDが登録済みか確認
    const sendInit = () => socket.emit('client_init', { uuid: myUuid });
    sendInit();

    socket.on('connect', () => {
      sendInit(); // 再接続時も初期化
    });

    socket.on('init_res', (data) => {
      if (data.status === 'REGISTERED') {
        setIsRegistered(true);
        setStudentInfo({ studentNumber: data.studentNumber, className: data.class });
      }
      setIsLoading(false);
    });

    // 講師による承認完了通知
    socket.on('approved_res', (data) => {
      if (data.success) {
        setMessage('✅ 利用者登録が完了しました！');
        setTimeout(() => {
          setIsRegistered(true);
          setStudentInfo({ studentNumber: data.studentNumber, className: data.class });
          setIsLoading(false);
          setMessage('');
        }, 2000);
      }
    });

    socket.on('status_update', (s) => setSystemStatus(s));
    socket.on('quiz_update', (q) => {
      setCurrentQuiz(q);
      setSelectedAnswer('');
      // --- 回答済み復帰ロジック ---
      if (q && q.quiz_id) {
        const answeredIds = JSON.parse(localStorage.getItem('answered_quiz_ids') || '[]');
        if (answeredIds.includes(q.quiz_id)) {
          setHasAnswered(true);
        } else {
          setHasAnswered(false);
        }
      } else {
        setHasAnswered(false);
      }
    });

    // 回答結果受信時に回答済みIDを保存
    socket.on('answer_res', (res) => {
      if (res.success && currentQuiz && currentQuiz.quiz_id) {
        const answeredIds = JSON.parse(localStorage.getItem('answered_quiz_ids') || '[]');
        if (!answeredIds.includes(currentQuiz.quiz_id)) {
          answeredIds.push(currentQuiz.quiz_id);
          localStorage.setItem('answered_quiz_ids', JSON.stringify(answeredIds));
        }
      }
    });

    // 切断時の自動再接続はsocket.ioのreconnectionで対応

    return () => { if (socket) socket.disconnect(); };
  }, []);

  const handleRegister = (e: any) => {
    e.preventDefault();
    const num = e.target.studentNumber.value;
    if (!num) return;
    
    const myUuid = localStorage.getItem('student_uuid');
    
    // 申請受付メッセージを表示
    setIsLoading(true);
    setMessage('📩 参加申請を送信しました。講師の承認を待っています...');

    socket.emit('submit_registration', { 
      uuid: myUuid, 
      studentNumber: num 
    });
  };

  const handleAnswer = (ans: string) => {
    if (hasAnswered || systemStatus !== 'ACTIVE' || !currentQuiz) return;
    setSelectedAnswer(ans);
    setHasAnswered(true);
    socket.emit('submit_answer', {
      uuid: localStorage.getItem('student_uuid'),
      quiz_id: currentQuiz.quiz_id,
      answer: ans
    });
    // 回答済みIDはanswer_resで保存する
  };

  // --- 表示レイアウト ---

  // ローディング または 申請中・承認完了メッセージ
  if (isLoading || message) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-blue-50 p-6 text-center">
        <div className="text-5xl mb-6 animate-pulse">📡</div>
        <div className="bg-white p-6 rounded-3xl shadow-xl border-2 border-blue-100">
          <p className="font-bold text-blue-800 leading-relaxed">{message || "接続を確認中..."}</p>
        </div>
      </div>
    );
  }

  // 未登録画面（申請フォーム）
  if (!isRegistered) {
    return (
      <div className="h-screen flex items-center justify-center bg-white p-8">
        <div className="w-full max-w-xs space-y-8">
          <div className="text-center">
            <h1 className="text-2xl font-black text-blue-900 tracking-tighter">QUIZ SYSTEM</h1>
            <p className="text-xs text-gray-400 font-bold mt-1 uppercase tracking-widest">Student Entry</p>
          </div>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 ml-2">STUDENT ID</label>
              <input 
                name="studentNumber" 
                type="text" 
                placeholder="学籍番号を入力" 
                className="w-full border-2 p-4 rounded-2xl outline-none focus:border-blue-500 font-mono text-center text-lg bg-gray-50" 
                required 
              />
            </div>
            <button 
              type="submit" 
              className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-lg hover:bg-blue-700 active:scale-95 transition-all"
            >
              参加申請を送る
            </button>
          </form>
        </div>
      </div>
    );
  }

  // メイン講義画面
  return (
    <main className="p-6 max-w-md mx-auto min-h-screen">
      <header className="flex justify-between items-center mb-8 bg-white p-4 rounded-2xl border shadow-sm">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-gray-400 leading-none">CLASS</span>
          <span className="text-sm font-black text-gray-800">{studentInfo.className}</span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[10px] font-bold text-gray-400 leading-none">ID</span>
          <span className="font-mono font-bold text-blue-600">{studentInfo.studentNumber}</span>
        </div>
      </header>

      {systemStatus === 'PREPARING' ? (
        <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
          <div className="text-6xl mb-4 grayscale opacity-30">☕</div>
          <p className="font-bold text-gray-400">講義の開始を待っています</p>
        </div>
      ) : currentQuiz ? (
        <div className="space-y-6">
          <div className="bg-blue-600 text-white p-8 rounded-[2rem] shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-20 text-4xl">❓</div>
            <h2 className="text-lg font-bold leading-relaxed relative z-10">{currentQuiz.question}</h2>
          </div>
          <div className="grid gap-3">
            {["ア", "イ", "ウ", "エ"].map((opt) => (
              <button
                key={opt}
                onClick={() => handleAnswer(opt)}
                disabled={hasAnswered}
                className={`p-5 rounded-2xl text-left font-bold border-2 transition-all shadow-sm ${
                  selectedAnswer === opt 
                    ? 'bg-blue-600 border-blue-600 text-white shadow-blue-200 scale-[1.02]' 
                    : 'bg-white border-gray-100 text-gray-700 hover:border-blue-200'
                }`}
              >
                <span className="inline-block w-8 h-8 bg-gray-100 rounded-lg text-center leading-8 mr-3 text-sm group-active:bg-blue-500">{opt}</span>
                {currentQuiz.details[opt]}
              </button>
            ))}
          </div>
          {hasAnswered && (
            <div className="text-center p-4 bg-green-50 rounded-2xl border border-green-100 animate-pulse">
              <p className="text-green-600 font-bold text-sm">✓ 回答を送信しました</p>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-20 opacity-30">
          <div className="animate-spin inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mb-4"></div>
          <p className="font-bold">次の問題を準備中...</p>
        </div>
      )}
    </main>
  );
}