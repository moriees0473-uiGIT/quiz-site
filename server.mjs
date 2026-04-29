// --- システムログ記録関数 ---
async function writeLog(db, category, userId, message, data = null) {
  try {
    await db.run(
      `INSERT INTO system_logs (timestamp, category, user_id, message, raw_data) VALUES (?, ?, ?, ?, ?)`,
      [getJSTNow(), category, userId, message, data ? JSON.stringify(data) : null]
    );
  } catch (e) {
    console.error('[LOG ERROR]', e);
  }
}
import "dotenv/config"; 
import { createServer } from "node:http";
import { parse } from "node:url";
import next from "next";
import { Server } from "socket.io";
import sqlite3 from "sqlite3";
import { open } from "sqlite";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = process.env.PORT || 3000;
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// 環境変数から管理者情報を取得
const ADMIN_ID = process.env.ADMIN_ID || "admin";
const ADMIN_PW = process.env.ADMIN_PW || "password";

console.log(`[AUTH CONFIG] ID: ${ADMIN_ID} / PW: ${ADMIN_PW}`);

// 状態管理
let systemStatus = "PREPARING";
let currentQuiz = null;

function getJSTNow() {
  const now = new Date();
  const jstOffset = 9 * 60 * 60 * 1000;
  return new Date(now.getTime() + jstOffset).toISOString().replace('T', ' ').substring(0, 19);
}

async function initDB() {
  const db = await open({ filename: "./database.sqlite", driver: sqlite3.Database });
  console.log("Database connected.");
  return db;
}

async function broadcastStats(io, db, quizId) {
  try {
    const responses = await db.all("SELECT answer FROM quiz_responses WHERE quiz_id = ?", [quizId]);
    const usersCount = (await db.get("SELECT COUNT(*) as count FROM users")).count;
    const counts = {};
    responses.forEach(r => { counts[r.answer] = (counts[r.answer] || 0) + 1; });
    io.emit("quiz_stats", {
      respondentCount: responses.length,
      totalStudents: usersCount,
      rate: usersCount > 0 ? Math.round((responses.length / usersCount) * 100) : 0,
      counts
    });
  } catch (e) { console.error("Stats Error:", e); }
}

app.prepare().then(async () => {
  const db = await initDB();
  const httpServer = createServer(async (req, res) => {
    const parsedUrl = parse(req.url, true);
    const { pathname } = parsedUrl;

    // --- カスタムAPIルート開始 ---

    // 1. ログイン
    if (pathname === "/api/admin/login" && req.method === "POST") {
      let body = "";
      req.on("data", chunk => body += chunk);
      req.on("end", () => {
        const { id, pw } = JSON.parse(body);
        if (id === ADMIN_ID && pw === ADMIN_PW) {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true, token: "ADMIN_LOGGED_IN" }));
        } else {
          res.writeHead(401); res.end();
        }
      });
      return; // 重要：ここで処理を抜ける
    }

    // 2. SQL実行
    if (pathname === "/api/admin/execute-sql" && req.method === "POST") {
      let body = "";
      req.on("data", chunk => body += chunk);
      req.on("end", async () => {
        try {
          const { sql } = JSON.parse(body);
          const isSelect = /^\s*select/i.test(sql);
          let result;
          if (isSelect) {
            result = await db.all(sql);
          } else {
            result = await db.run(sql);
          }
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true, result }));
        } catch (e) {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: false, error: e.message }));
        }
      });
      return;
    }

    // 3. クイズインポート
    if (pathname === "/api/admin/import-quizzes" && req.method === "POST") {
      let body = "";
      req.on("data", chunk => body += chunk);
      req.on("end", async () => {
        try {
          const quizzes = JSON.parse(body);
          await db.run("BEGIN TRANSACTION");
          for (const q of quizzes) {
            await db.run(
              `INSERT OR REPLACE INTO quizzes (quiz_id, category, question_text, option_a, option_b, option_c, option_d, correct_answer, points) VALUES (?,?,?,?,?,?,?,?,?)`,
              [q.quiz_id, q.category, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.correct_answer, q.points]
            );
          }
          await db.run("COMMIT");
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true }));
        } catch (e) {
          await db.run("ROLLBACK");
          res.writeHead(500); res.end("Import Error");
        }
      });
      return;
    }

    // 4. ユーザーインポート
    if (pathname === "/api/admin/import-users" && req.method === "POST") {
      let body = "";
      req.on("data", chunk => body += chunk);
      req.on("end", async () => {
        try {
          const users = JSON.parse(body);
          await db.run("BEGIN TRANSACTION");
          for (const u of users) {
            const uuid = u.uuid || `imp-${Math.random().toString(36).substring(2, 11)}`;
            await db.run(
              "INSERT OR REPLACE INTO users (uuid, student_number, class, created_at) VALUES (?, ?, ?, ?)",
              [uuid, u.student_number, u.class, getJSTNow()]
            );
          }
          await db.run("COMMIT");
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true }));
        } catch (e) {
          await db.run("ROLLBACK");
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: false, error: e.message }));
        }
      });
      return;
    }

    // 5. 成績エクスポート
    if (pathname === "/api/admin/export-scores") {
      const scores = await db.all(`SELECT u.class, u.student_number, COUNT(r.id) as ans, SUM(r.is_correct) as correct FROM users u LEFT JOIN quiz_responses r ON u.uuid = r.uuid GROUP BY u.uuid ORDER BY u.class, u.student_number`);
      let csv = "\uFEFFクラス,学籍番号,回答数,正答数\n";
      scores.forEach(s => csv += `${s.class},${s.student_number},${s.ans},${s.correct}\n`);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", "attachment; filename=scores.csv");
      res.end(csv);
      return;
    }

    // 6. ユーザーエクスポート (404対策済み)
    if (pathname === "/api/admin/export-users") {
      try {
        const rows = await db.all("SELECT * FROM users ORDER BY class, student_number");
        let csv = "\uFEFFuuid,学籍番号,クラス,登録日時\n";
        rows.forEach(r => csv += `${r.uuid || ""},${r.student_number || ""},${r.class || ""},${r.created_at || ""}\n`);
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", "attachment; filename=users.csv");
        res.end(csv);
      } catch (e) {
        res.writeHead(500); res.end("Export Error");
      }
      return;
    }

    // Next.jsの標準リクエスト処理
    await handle(req, res, parsedUrl);
  });

  const io = new Server(httpServer);
  io.on("connection", (socket) => {
    socket.emit("status_update", systemStatus);
    socket.emit("quiz_update", currentQuiz);

    socket.on("client_init", async ({ uuid }) => {
      try {
        const user = await db.get("SELECT * FROM users WHERE uuid = ?", [uuid]);
        await writeLog(db, "client_init", uuid, user ? "接続確認:登録済み" : "接続確認:未登録", { uuid });
        if (user) {
          socket.emit("init_res", { status: "REGISTERED", studentNumber: user.student_number, class: user.class });
        } else {
          socket.emit("init_res", { status: "UNREGISTERED" });
          io.emit("admin_new_request", { socketId: socket.id, uuid, studentNumber: "再承認が必要", isReRegistration: true });
        }
      } catch (e) {
        await writeLog(db, "client_init", uuid, "接続確認エラー", { error: e.message });
        socket.emit("error", { message: "client_init error" });
      }
    });

    socket.on("submit_registration", (data) => io.emit("admin_new_request", { socketId: socket.id, ...data }));
    socket.on("approve_student", async (data) => {
      try {
        await db.run("INSERT OR REPLACE INTO users VALUES (?, ?, ?, ?)", [data.uuid, data.studentNumber, data.className, getJSTNow()]);
        await writeLog(db, "approve_student", data.uuid, "管理者による承認", data);
        io.to(data.targetSocketId).emit("approved_res", { success: true, studentNumber: data.studentNumber, class: data.className });
      } catch (e) {
        await writeLog(db, "approve_student", data.uuid, "承認エラー", { error: e.message });
        io.to(data.targetSocketId).emit("approved_res", { success: false, error: e.message });
      }
    });

    socket.on("get_quiz_list", async () => {
      try {
        const list = await db.all("SELECT * FROM quizzes");
        socket.emit("quiz_list_res", list);
      } catch (e) {
        socket.emit("error", { message: "get_quiz_list error" });
      }
    });

    socket.on("change_status", (s) => { systemStatus = s; io.emit("status_update", s); });
    socket.on("start_quiz", async (q) => {
      try {
        // DBから正しいクイズデータを取得
        const dbQuiz = await db.get("SELECT * FROM quizzes WHERE quiz_id = ?", [q.quiz_id]);
        if (!dbQuiz) {
          console.error("[ERROR] クイズがDBに存在しません:", q.quiz_id);
          return;
        }
        const options = [dbQuiz.option_a, dbQuiz.option_b, dbQuiz.option_c, dbQuiz.option_d].filter(opt => opt !== undefined && opt !== null);
        console.log("[DEBUG] 配信dbQuiz:", dbQuiz);
        console.log("[DEBUG] options配列:", options);
        currentQuiz = {
          ...dbQuiz,
          options
        };
        io.emit("quiz_update", currentQuiz);
        await writeLog(db, "start_quiz", null, "クイズ配信開始", currentQuiz);
        await broadcastStats(io, db, dbQuiz.quiz_id);
      } catch (e) {
        await writeLog(db, "start_quiz", null, "クイズ配信開始エラー", { error: e.message });
      }
    });
    socket.on("stop_quiz", () => { currentQuiz = null; io.emit("quiz_update", null); });

    socket.on("submit_answer", async (data) => {
      try {
        const user = await db.get("SELECT * FROM users WHERE uuid = ?", [data.uuid]);
        const quiz = await db.get("SELECT correct_answer FROM quizzes WHERE quiz_id = ?", [data.quiz_id]);
        if (user && quiz) {
          // 重複回答チェック
          const exists = await db.get("SELECT 1 FROM quiz_responses WHERE uuid = ? AND quiz_id = ?", [data.uuid, data.quiz_id]);
          if (exists) {
            await writeLog(db, "submit_answer", data.uuid, "重複回答スキップ", data);
            socket.emit("answer_res", { success: false, error: "duplicate" });
            return;
          }
          const isCorrect = quiz.correct_answer === data.answer ? 1 : 0;
          await db.run("INSERT INTO quiz_responses (timestamp, uuid, student_number, class, quiz_id, answer, is_correct) VALUES (?,?,?,?,?,?,?)", 
            [getJSTNow(), data.uuid, user.student_number, user.class, data.quiz_id, data.answer, isCorrect]);
          await writeLog(db, "submit_answer", data.uuid, "回答受信", data);
          socket.emit("answer_res", { success: true });
          await broadcastStats(io, db, data.quiz_id);
        } else {
          await writeLog(db, "submit_answer", data.uuid, "ユーザーまたはクイズ情報なし", data);
          socket.emit("answer_res", { success: false, error: "user_or_quiz_not_found" });
        }
      } catch (e) {
        await writeLog(db, "submit_answer", data.uuid || null, "回答受信エラー", { error: e.message, data });
        socket.emit("answer_res", { success: false, error: e.message });
      }
    });
  });

  httpServer.listen(port, () => console.log(`> Server ready on http://localhost:${port}`));
});