const path = require("path");
const fs = require("fs");
const sqlite3 = require("sqlite3").verbose();

const DB_PATH =
  process.env.DB_PATH || path.join(__dirname, "..", "data.sqlite");
const dbDirectory = path.dirname(DB_PATH);
if (!fs.existsSync(dbDirectory)) {
  // إنشاء مجلد قاعدة البيانات عند التشغيل لأول مرة.
  fs.mkdirSync(dbDirectory, { recursive: true });
}

const db = new sqlite3.Database(DB_PATH);

/**
 * تهيئة الجداول والقيود الأساسية.
 */
function initializeDatabase() {
  db.serialize(() => {
    db.run("PRAGMA foreign_keys = ON");

    db.run(`
      CREATE TABLE IF NOT EXISTS employees (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_number TEXT NOT NULL UNIQUE,
        national_id TEXT NOT NULL,
        full_name TEXT NOT NULL,
        job_title TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT NOT NULL,
        hospital TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS delegations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id INTEGER NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        delegation_type TEXT NOT NULL,
        from_entity TEXT NOT NULL,
        to_entity TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(employee_id) REFERENCES employees(id) ON DELETE CASCADE,
        UNIQUE(employee_id, start_date, end_date, from_entity, to_entity)
      )
    `);
  });
}

module.exports = {
  db,
  initializeDatabase,
};
