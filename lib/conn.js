const Database = require('better-sqlite3');
const path = require('path');
require('dotenv').config();

const dbPath = path.join(process.env.DB_DIR, process.env.DB_File);
const db = new Database(dbPath);

// Optimisasi performa dengan PRAGMA
db.pragma('journal_mode = WAL'); // Write-Ahead Logging untuk performa tulis
db.pragma('synchronous = NORMAL'); // Balance antara keamanan dan performa
db.pragma('cache_size = 1000000'); // Cache 1GB untuk query cepat
db.pragma('foreign_keys = ON'); // Aktifkan foreign key constraints
db.pragma('temp_store = memory'); // Simpan tabel temp di memory
db.pragma('mmap_size = 268435456'); // Memory-mapped I/O 256MB

// Fungsi helper untuk query
function all(sql, params = []) {
  const stmt = db.prepare(sql);
  return stmt.all(params);
}

function run(sql, params = []) {
  const stmt = db.prepare(sql);
  return stmt.run(params);
}

function get(sql, params = []) {
  const stmt = db.prepare(sql);
  return stmt.get(params);
}

function exec(sql) {
  return db.exec(sql);
}

function close() {
  db.close();
}

module.exports = {
  db,
  all,
  run,
  get,
  exec,
  close
};
