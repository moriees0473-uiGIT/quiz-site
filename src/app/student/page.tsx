"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { SystemStatus } from '@/types/types';

const socket: Socket = io(); // 引数を空にすると、自分自身(localhost:3000)に繋ぎにいきます

export default function StudentPage() {
  const router = useRouter();
  const [status, setStatus] = useState<SystemStatus>('PREPARING');

  useEffect(() => {
    socket.on('status_changed', (newStatus: SystemStatus) => {
      setStatus(newStatus);
    });
    return () => { socket.off('status_changed'); };
  }, []);

  return (
    <main className="p-8 text-center">
      <h1 className="text-2xl font-bold text-yellow-600 mb-4">生徒専用画面</h1>
      <div className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200 inline-block">
        <p className="text-sm text-yellow-700">現在のシステム状態</p>
        <p className="text-xl font-mono font-bold">{status}</p>
      </div>
      
      <div className="mt-8">
        <button 
          onClick={() => router.push('/')} 
          className="text-sm text-gray-500 underline"
        >
          役割選択に戻る
        </button>
      </div>
    </main>
  );
}