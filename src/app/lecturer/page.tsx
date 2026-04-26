"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { SystemStatus } from '../types/types';

const socket: Socket = io(); // 引数を空にすると、自分自身(localhost:3000)に繋ぎにいきます

export default function LecturerPage() {
  const router = useRouter();
  const [status, setStatus] = useState<SystemStatus>('PREPARING');

  useEffect(() => {
    socket.on('status_changed', (newStatus: SystemStatus) => {
      setStatus(newStatus);
    });
    return () => { socket.off('status_changed'); };
  }, []);

  // スライドを開始する関数（URL隠蔽の鍵になります）
  const startSlide = (slideId: string) => {
    // 生徒には「スライドID」だけを送り、URLそのものは送らない
    console.log(`${slideId} のスライドを開始します`);
    socket.emit('change_status', 'ACTIVE'); 
    // ここで将来的に「今はこの講義です」という信号を送るロジックを追加します
  };

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold text-green-600 mb-6">講師専用管理パネル</h1>
      
      <div className="grid gap-6 md:grid-cols-2">
        {/* ステータス管理 */}
        <div className="p-6 border rounded-xl bg-white shadow-sm">
          <h2 className="text-lg font-semibold mb-2">システム制御</h2>
          <p className="text-sm text-gray-500 mb-4">現在の状態: <span className="font-bold text-green-600">{status}</span></p>
          <div className="flex gap-2">
            <button 
              onClick={() => socket.emit('change_status', 'ACTIVE')}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
            >
              講義開始 (ACTIVE)
            </button>
            <button 
              onClick={() => socket.emit('change_status', 'PREPARING')}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
            >
              一時停止
            </button>
          </div>
        </div>

        {/* スライド操作（ここが将来の隠蔽ポイント） */}
        <div className="p-6 border rounded-xl bg-white shadow-sm">
          <h2 className="text-lg font-semibold mb-2">講義資料（Slidev）</h2>
          <ul className="space-y-3">
            <li className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <span>第1回：ネットワーク概論</span>
              <button 
                onClick={() => startSlide('lecture-01')}
                className="text-sm bg-blue-500 text-white px-3 py-1 rounded"
              >
                スライド表示
              </button>
            </li>
            <li className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <span>第2回：プロトコル詳解</span>
              <button 
                onClick={() => startSlide('lecture-02')}
                className="text-sm bg-blue-500 text-white px-3 py-1 rounded"
              >
                スライド表示
              </button>
            </li>
          </ul>
        </div>
      </div>

      <div className="mt-12 text-center">
        <button 
          onClick={() => router.push('/')} 
          className="text-sm text-gray-400 underline hover:text-gray-600"
        >
          役割選択（トップ）に戻る
        </button>
      </div>
    </main>
  );
}