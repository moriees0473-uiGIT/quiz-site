"use client";

import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import * as XLSX from 'xlsx';

let socket: Socket;

export default function AdminPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginForm, setLoginForm] = useState({ id: '', pw: '' });
  const [requests, setRequests] = useState<any[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<{ [key: string]: string }>({});
  const [sql, setSql] = useState("");
  const [sqlResult, setSqlResult] = useState("");
  const [sqlTable, setSqlTable] = useState<any[]|null>(null);
  const [sqlError, setSqlError] = useState<string>("");
  
  // ドロップダウン用ステート
  const [importTarget, setImportTarget] = useState("quiz");
  const [exportTarget, setExportTarget] = useState("scores");

  useEffect(() => {
    if (sessionStorage.getItem('admin_token') === 'ADMIN_LOGGED_IN') {
      setIsLoggedIn(true);
      socket = io();
      socket.on('admin_new_request', (data) => setRequests(prev => [...prev.filter(r => r.socketId !== data.socketId), data]));
    }
  }, []);

  const handleLogin = async () => {
    const res = await fetch('/api/admin/login', { method: 'POST', body: JSON.stringify(loginForm) });
    if (res.ok) { sessionStorage.setItem('admin_token', 'ADMIN_LOGGED_IN'); window.location.reload(); }
  };

  // 一括インポート処理
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const jsonData = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);

      // --- クイズデータのバリデーション ---
      if (importTarget === "quiz") {
        const requiredCols = ["quiz_id", "question_text", "option_a", "option_b", "option_c", "option_d", "correct_answer", "points"];
        const first = jsonData[0];
        const isObject = typeof first === "object" && first !== null;
        const missing = isObject ? requiredCols.filter(col => !(col in first)) : requiredCols;
        if (missing.length > 0) {
          alert("不足している列: " + missing.join(", "));
          e.target.value = "";
          return;
        }
        // 空欄チェック
        const emptyRows = jsonData.filter((row: any, idx: number) => !row.quiz_id || !row.question_text).map((_, idx) => idx + 2); // Excel行番号
        if (emptyRows.length > 0) {
          alert(`quiz_idまたはquestion_textが空の行があります（${emptyRows.join(", ")}行目）`);
          e.target.value = "";
          return;
        }
      }

      const endpoint = importTarget === "quiz" ? "/api/admin/import-quizzes" : "/api/admin/import-users";
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jsonData)
      });

      if (res.ok) alert(`${importTarget === "quiz" ? "クイズ" : "ユーザー"}のインポートに成功しました`);
      else alert("エラーが発生しました");
      e.target.value = ""; // リセット
    };
    reader.readAsBinaryString(file);
  };

  // エクスポート処理
  const handleExport = () => {
    const endpoint = exportTarget === "scores" ? "/api/admin/export-scores" : "/api/admin/export-users";
    window.location.href = endpoint;
  };

  const approve = (req: any) => {
    const cls = selectedClasses[req.socketId];
    if (!cls) return alert("クラス選択必須");
    socket.emit('approve_student', { targetSocketId: req.socketId, uuid: req.uuid, studentNumber: req.studentNumber, className: cls });
    setRequests(prev => prev.filter(r => r.socketId !== req.socketId));
  };

  if (!isLoggedIn) return (
    <div className="h-screen flex items-center justify-center bg-slate-900">
      <div className="bg-white p-8 rounded-3xl shadow-xl space-y-4">
        <h1 className="font-bold text-center">ADMIN LOGIN</h1>
        <input type="text" placeholder="ID" className="border p-2 w-full rounded" onChange={e => setLoginForm({...loginForm, id: e.target.value})} />
        <input type="password" placeholder="PW" className="border p-2 w-full rounded" onChange={e => setLoginForm({...loginForm, pw: e.target.value})} />
        <button onClick={handleLogin} className="w-full bg-blue-600 text-white py-2 rounded">Login</button>
      </div>
    </div>
  );

  return (
    <main className="p-8 space-y-6 bg-gray-50 min-h-screen">
      <header className="flex justify-between p-6 bg-white rounded-2xl shadow-sm border items-center">
        <h1 className="font-black text-xl tracking-tighter">ADMIN CONSOLE</h1>
        <button onClick={() => window.open('/lecturer', '_blank')} className="bg-blue-600 text-white px-5 py-2 rounded-full text-xs font-bold">講師画面を開く</button>
      </header>

      {/* メイン2カラム：左 参加承認待ち／右 データ一括取込・出力 */}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 左側：承認申請 */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border flex flex-col justify-between" style={{height: '100%'}}>
          <div>
            <h2 className="font-bold mb-4 flex items-center gap-2">👤 参加承認待ち</h2>
            <div className="space-y-2 h-64 md:h-[220px] overflow-y-auto pr-2">
              {requests.length === 0 && <p className="text-gray-300 text-sm py-10 text-center">申請はありません</p>}
              {requests.map(req => (
                <div key={req.socketId} className={`p-4 rounded-xl border flex justify-between items-center ${req.isReRegistration ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-100'}`}>
                  <span className="font-bold font-mono">{req.studentNumber}</span>
                  <div className="flex gap-2">
                    <select className="text-xs border rounded-lg p-1" onChange={e => setSelectedClasses({...selectedClasses, [req.socketId]: e.target.value})}>
                      <option value="">クラス選択</option>
                      <option value="Aクラス">A</option><option value="Bクラス">B</option><option value="Cクラス">C</option>
                    </select>
                    <button onClick={() => approve(req)} className="bg-green-600 text-white px-3 py-1 rounded-lg text-xs font-bold">承認</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 右側：一括操作（集約UI） */}
        <div className="flex flex-col gap-6 justify-between h-full">
          <section className="bg-white p-6 rounded-2xl shadow-sm border mb-2">
            <h2 className="font-bold mb-4 flex items-center gap-2">📥 データ一括取込 (Excel)</h2>
            <div className="flex gap-2 mb-2 items-center">
              <select value={importTarget} onChange={(e) => setImportTarget(e.target.value)} className="flex-1 text-sm border rounded-xl p-2 bg-gray-50">
                <option value="quiz">クイズデータ (.xlsx)</option>
                <option value="user">ユーザーマスタ (.xlsx)</option>
              </select>
              <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} className="text-xs file:bg-blue-50 file:text-blue-700 file:border-0 file:rounded-xl file:px-4 file:py-2 file:font-bold" />
            </div>
          </section>

          <section className="bg-white p-6 rounded-2xl shadow-sm border mt-0">
            <h2 className="font-bold mb-4 flex items-center gap-2">📤 データ出力 (CSV)</h2>
            <div className="flex gap-2 mb-2">
              <select value={exportTarget} onChange={(e) => setExportTarget(e.target.value)} className="flex-1 text-sm border rounded-xl p-2 bg-gray-50">
                <option value="scores">成績一覧 (scores.csv)</option>
                <option value="users">登録ユーザー (users.csv)</option>
              </select>
              <button onClick={handleExport} className="bg-slate-800 text-white px-6 py-2 rounded-xl text-xs font-bold">実行</button>
            </div>
          </section>
        </div>
      </div>

      {/* SQLコンソールを一番下に移動 */}
      <section className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl mt-8">
        <h2 className="text-blue-400 font-bold mb-4 flex items-center gap-2 text-sm uppercase tracking-widest">Advanced SQL Console</h2>
        <textarea 
          className="w-full h-16 bg-slate-800 p-4 font-mono text-xs text-green-400 rounded-2xl border border-slate-700 outline-none focus:border-blue-500 resize-none" 
          value={sql}
          onChange={e => setSql(e.target.value)}
          placeholder="SELECT * FROM users;"
        />
        <div className="flex justify-between mt-4 items-center">
          <span className={`text-[10px] font-mono ${sqlResult.includes('Error') ? 'text-orange-400' : 'text-gray-400'}`}>{sqlResult}</span>
          <button onClick={async () => {
            setSqlTable(null);
            setSqlError("");
            const res = await fetch('/api/admin/execute-sql', { method: 'POST', body: JSON.stringify({ sql }) });
            const data = await res.json();
            if (data.success) {
              if (Array.isArray(data.result)) {
                setSqlResult(`Rows: ${data.result.length}`);
                setSqlTable(data.result);
              } else {
                setSqlResult("Success");
                setSqlTable(null);
              }
            } else {
              setSqlResult("");
              setSqlTable(null);
              setSqlError("Error: " + data.error);
            }
          }} className="bg-blue-600 hover:bg-blue-500 px-8 py-2 rounded-xl font-bold transition-colors">Run Query</button>
        </div>
        {/* SQL結果テーブル表示・エラー表示 */}
        <div className="overflow-auto mt-4 bg-slate-800 rounded-xl min-h-[60px] p-2">
          {sqlError && <div className="text-orange-400 text-xs mb-2">{sqlError}</div>}
          {/* テーブルヘッダーは常に表示 */}
          {Array.isArray(sqlTable) ? (
            sqlTable.length > 0 ? (
              <>
                {console.log('SQL TABLE:', sqlTable)}
                <table className="min-w-full text-xs text-left border border-blue-400">
                  <thead>
                    <tr>
                      {Object.keys(sqlTable[0] || {}).map((col) => (
                        <th key={col} className="px-2 py-1 border-b border-slate-700 text-blue-300">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sqlTable.map((row, i) => (
                      <tr key={i} className="hover:bg-slate-700">
                        {Object.values(row || {}).map((val, j) => (
                          <td key={j} className="px-2 py-1 border-b border-slate-700 text-white">{val === null || val === undefined ? "" : String(val)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            ) : (
              <div className="text-gray-400 text-xs">データなし</div>
            )
          ) : null}
        </div>
      </section>
    </main>
  );
}