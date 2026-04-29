import sqlite3 from "sqlite3";
import { open } from "sqlite";

const db = await open({ filename: "./database.sqlite", driver: sqlite3.Database });

await db.exec(`
CREATE TABLE IF NOT EXISTS quiz_responses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL,
  uuid TEXT NOT NULL,
  student_number TEXT NOT NULL,
  class TEXT NOT NULL,
  quiz_id TEXT NOT NULL,
  answer TEXT NOT NULL,
  is_correct INTEGER
);
`);

console.log("quiz_responses テーブル作成完了");
await db.close();
