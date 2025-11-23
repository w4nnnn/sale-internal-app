const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const dbPath = path.join(process.env.DB_DIR, process.env.DB_File);
const db = new Database(dbPath);

try {
  const sql = fs.readFileSync('db.sql', 'utf8');
  db.exec(sql);
  console.log('Database migration completed successfully.');
} catch (error) {
  console.error('Error during migration:', error);
} finally {
  db.close();
}
