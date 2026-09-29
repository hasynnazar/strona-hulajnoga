const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new Database(dbPath, { verbose: console.log });

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS slots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    is_available INTEGER DEFAULT 1,
    UNIQUE(date, time)
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    model TEXT NOT NULL,
    issue TEXT NOT NULL,
    delivery_type TEXT NOT NULL,
    address TEXT,
    slot_id INTEGER,
    status TEXT DEFAULT 'Nowe',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(slot_id) REFERENCES slots(id)
  );
`);

module.exports = db;
