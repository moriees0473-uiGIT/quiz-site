"use client";

import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

let socket: Socket;

export default function StudentPage() {
  const [status, setStatus] = useState<'LOADING' | 'UNREGISTERED' | 'REGISTERED'>('LOADING');
  const [systemStatus, setSystemStatus] = useState('PREPARING');
  const [currentQuiz, setCurrentQuiz] = useState<any>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string>("");
  const [studentInfo, setStudentInfo] = useState({ studentNumber: '', className: '' });
  const [uuid, setUuid] = useState('');

  useEffect(() => {
    socket = io();
    let storedUuid = localStorage.getItem('student_uuid');
    if (!storedUuid) {
      storedUuid = crypto.randomUUID();
      localStorage.setItem('student_uuid', storedUuid);
    }
    setUuid(storedUuid);
    socket.emit('client_init', { uuid: storedUuid });

    socket.on('init_res', (data) => {
      if (data.status === 'REGISTERED') {
        setStatus('REGISTERED');
        setStudentInfo({ studentNumber: data.studentNumber, className: data.class });
      } else { setStatus('UNREGISTERED'); }
    });

    socket.on('quiz_update', (quiz) => {
      setCurrentQuiz(quiz);
      setHasAnswered(false); // 新しいクイズが来たら回答状態をリセット
      setSelectedOption(""); // 新しいクイズ時は選択肢リセット
    });

    socket.on('status_update', (s) => setSystemStatus(s));

    return () => { socket.off('init_res'); socket.off('quiz_update'); socket.off('status_update'); };
  }, []);

  const handleRegister = () => {
    if (!studentInfo.studentNumber) return alert('生徒番号を入力してください');
    socket.emit('submit_registration', { uuid, studentNumber: studentInfo.studentNumber });
  };

  const submitAnswer = (answer: string) => {
    if (!socket) {
      alert("接続が確立されていません。ページを再読み込みしてください。");
      return;
    }
    socket.emit('submit_answer', { uuid, quiz_id: currentQuiz.quiz_id, answer });
    setHasAnswered(true);
  };

  if (status === 'LOADING') return <div className="p-8 text-center">接続中...</div>;

  return (
    <main className="p-6 max-w-md mx-auto space-y-6">
      <header className="flex justify-between items-center border-b pb-2">
        <h1 className="font-bold text-gray-800 tracking-tighter">STUDENT PANEL</h1>
        {status === 'REGISTERED' && <span className="text-[10px] bg-gray-100 px-2 py-1 rounded font-bold">{studentInfo.studentNumber}</span>}
      </header>

      {status === 'UNREGISTERED' ? (
        <div className="p-6 border rounded-2xl space-y-4">
          <input className="w-full border p-3 rounded-xl" placeholder="生徒番号" onChange={(e) => setStudentInfo({...studentInfo, studentNumber: e.target.value})} />
          <button onClick={handleRegister} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold">登録申請</button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* 小テストエリア */}
          {currentQuiz ? (
            <div className="bg-white border-2 border-blue-600 rounded-2xl p-6 shadow-xl">
              {/* 問題文 */}
              <h2 className="text-lg font-bold mb-6 text-blue-800 text-center">{currentQuiz.question_text || currentQuiz.question}</h2>
              {hasAnswered ? (
                <p className="text-center py-8 font-bold text-green-600 animate-bounce">講師の回答待ちです...</p>
              ) : (
                <form onSubmit={e => { e.preventDefault(); submitAnswer(selectedOption); }}>
                  <div className="flex flex-col gap-4 mb-6">
                    {["ア", "イ", "ウ", "エ"].map((label, idx) => (
                      <label key={label} className="flex items-center p-3 border-2 border-gray-100 rounded-xl cursor-pointer hover:border-blue-200 transition-all">
                        <input
                          type="radio"
                          name="quiz_option"
                          value={label}
                          checked={selectedOption === label}
                          onChange={() => setSelectedOption(label)}
                          className="form-radio w-5 h-5 text-blue-600 mr-4"
                          required
                        />
                        <span className="inline-block w-8 font-bold text-gray-800">{label}</span>
                        <span className="ml-2 text-gray-700">{currentQuiz.options[idx]}</span>
                      </label>
                    ))}
                  </div>
                  <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-lg hover:bg-blue-700 active:scale-95 transition-all">回答する</button>
                </form>
              )}
            </div>
          ) : (
            <div className="bg-gray-50 border-2 border-dashed border-gray-200 p-10 rounded-2xl text-center">
              <p className="text-gray-400 font-bold">現在、小テストは<br/>配信されていません</p>
            </div>
          )}
        </div>
      )}
    </main>
  );
}