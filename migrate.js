const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const dbDir = process.env.DB_DIR;
const dbFile = process.env.DB_File;

if (!dbDir || !dbFile) {
  console.error("Harap set DB_DIR dan DB_File di berkas .env sebelum menjalankan migrasi.");
  process.exit(1);
}

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
  console.log(`Direktori ${dbDir} dibuat.`);
}

const dbPath = path.join(dbDir, dbFile);
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
