import sqlite3 from "sqlite3";
import { open } from "sqlite";

const db = await open({ filename: "./database.sqlite", driver: sqlite3.Database });

await db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT NOT NULL,
  student_number TEXT NOT NULL,
  class TEXT NOT NULL,
  created_at TEXT NOT NULL
);
`);

console.log("users テーブル作成完了");
await db.close();
