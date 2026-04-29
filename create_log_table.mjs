import sqlite3 from "sqlite3";
import { open } from "sqlite";

const db = await open({ filename: "./database.sqlite", driver: sqlite3.Database });

await db.exec(`
CREATE TABLE IF NOT EXISTS log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL,
  level TEXT NOT NULL,
  message TEXT NOT NULL,
  meta TEXT
);
`);

console.log("log テーブル作成完了");
await db.close();
