"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation'; // 追加：ページ移動のための道具
import { io, Socket } from 'socket.io-client';
import { SystemStatus, UserRole } from '@/types/types';

const socket: Socket = io(); // 引数を空にすると、自分自身(localhost:3000)に繋ぎにいきます
export default function Home() {
  const router = useRouter(); // 追加：ルーターの初期化
  const [status, setStatus] = useState<SystemStatus>('PREPARING');

  useEffect(() => {
    socket.connect();
    socket.on('status_changed', (newStatus: SystemStatus) => {
      setStatus(newStatus);
    });
    return () => {
      socket.disconnect();
    };
  }, []);

  // ロールを選択して専用ページへ移動する関数
  const handleRoleSelect = (role: UserRole) => {
    if (role === 'ADMIN') {
      socket.emit('change_status', 'ACTIVE');
      router.push('/admin'); // /admin へ移動
    } else if (role === 'LECTURER') {
      router.push('/lecturer'); // /lecturer へ移動
    } else if (role === 'STUDENT') {
      router.push('/student'); // /student へ移動
    }
  };

  return (
    <main className="p-8 text-center">
      <h1 className="text-2xl font-bold mb-4">小テストシステム (Next.js版)</h1>
      <p className="mb-8 text-gray-600">あなたの役割を選択してください</p>

      <div className="flex justify-center gap-6">
        <button 
          type="button" 
          onClick={() => handleRoleSelect('ADMIN')} 
          className="px-6 py-3 bg-blue-500 text-white rounded-lg shadow-md hover:bg-blue-600 transition-all"
        >
          管理者として開始
        </button>
        
        <button 
          type="button" 
          onClick={() => handleRoleSelect('LECTURER')} 
          className="px-6 py-3 bg-green-500 text-white rounded-lg shadow-md hover:bg-green-600 transition-all"
        >
          講師
        </button>

        <button 
          type="button" 
          onClick={() => handleRoleSelect('STUDENT')} 
          className="px-6 py-3 bg-yellow-500 text-white rounded-lg shadow-md hover:bg-yellow-600 transition-all"
        >
          生徒
        </button>
      </div>

      <div className="mt-12 p-4 bg-gray-50 inline-block rounded-md border">
        現在のシステム状態: <span className="font-bold">{status}</span>
      </div>
    </main>
  );
}