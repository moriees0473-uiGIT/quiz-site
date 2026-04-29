import sqlite3 from "sqlite3";
import { open } from "sqlite";

const db = await open({ filename: "./database.sqlite", driver: sqlite3.Database });

await db.exec(`
CREATE TABLE IF NOT EXISTS quizzes (
  quiz_id TEXT PRIMARY KEY,
  category TEXT,
  question_text TEXT,
  option_a TEXT,
  option_b TEXT,
  option_c TEXT,
  option_d TEXT,
  correct_answer TEXT,
  points INTEGER
);
`);

console.log("quizzes テーブル作成完了");
await db.close();
