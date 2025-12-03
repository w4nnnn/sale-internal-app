PRAGMA foreign_keys = ON;

-- -----------------------------------------------------
-- Tabel: Users
-- Menyimpan data user (agen, admin, dll) sekaligus untuk login
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS Users (
  user_id INTEGER PRIMARY KEY AUTOINCREMENT,
  nama_user TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,   -- Username khusus untuk login
  email_user TEXT,  -- Digunakan untuk kontak/email pemberitahuan
  telepon_user TEXT NOT NULL UNIQUE,  -- Digunakan untuk kontak/WhatsApp pemberitahuan
  password_hash TEXT NOT NULL,      -- HARUS disimpan dalam bentuk hash (misal: bcrypt)
  role TEXT NOT NULL DEFAULT 'agen'  -- Role akses: 'agen' atau 'admin'
);

-- -----------------------------------------------------
-- Tabel: Aplikasi
-- Menyimpan detail aplikasi yang dijual
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS Aplikasi (
  app_id INTEGER PRIMARY KEY AUTOINCREMENT,
  nama_app TEXT NOT NULL,
  
  -- Menentukan tipe aplikasi: 'demo', 'pelanggan', atau 'admin'
  tipe_app TEXT NOT NULL DEFAULT 'pelanggan' CHECK(tipe_app IN ('demo', 'pelanggan', 'admin')),
  
  deskripsi TEXT,
  link_web TEXT,
  path_ios TEXT,       -- Path file .ipa di hosting Anda (misal: /files/app_v1.ipa)
  path_android TEXT    -- Path file .apk di hosting Anda (misal: /files/app_v1.apk)
);

-- -----------------------------------------------------
-- Tabel: Pelanggan
-- Menyimpan data pelanggan yang membeli lisensi
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS Pelanggan (
  pelanggan_id INTEGER PRIMARY KEY AUTOINCREMENT,
  nama_pelanggan TEXT NOT NULL,
  email_pelanggan TEXT,
  perusahaan TEXT,
  telepon_pelanggan TEXT,
  added_user_id INTEGER NOT NULL,
  FOREIGN KEY (added_user_id) REFERENCES Users (user_id) ON DELETE RESTRICT
);

-- -----------------------------------------------------
-- Tabel: Lisensi
-- Tabel transaksi utama yang menghubungkan aplikasi,
-- pelanggan, dan user, serta menyimpan tanggal habis pakai.
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS Lisensi (
  lisensi_id INTEGER PRIMARY KEY AUTOINCREMENT,
  
  -- Foreign Key ke tabel Aplikasi
  app_id INTEGER NOT NULL,
  
  -- Foreign Key ke tabel Pelanggan
  pelanggan_id INTEGER NOT NULL,
  
  -- Foreign Key ke tabel Users (user yang bertanggung jawab)
  user_id INTEGER NOT NULL,
  
  tanggal_mulai DATE NOT NULL,
  tanggal_habis DATE NOT NULL,
  
  status_lisensi TEXT NOT NULL DEFAULT 'Aktif', -- Misal: 'Aktif', 'Habis', 'Dibatalkan'
  
  -- Kolom untuk penanda pengingat (0 = Belum, 1 = Sudah)
  -- Ini akan di-update oleh aplikasi Anda
  pengingat_terkirim INTEGER NOT NULL DEFAULT 0,

  FOREIGN KEY (app_id) REFERENCES Aplikasi (app_id) ON DELETE CASCADE,
  FOREIGN KEY (pelanggan_id) REFERENCES Pelanggan (pelanggan_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES Users (user_id) ON DELETE RESTRICT
);

-- -----------------------------------------------------
-- Index
-- Mempercepat pencarian berdasarkan foreign key dan tanggal
-- -----------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_lisensi_app ON Lisensi (app_id);
CREATE INDEX IF NOT EXISTS idx_lisensi_pelanggan ON Lisensi (pelanggan_id);
CREATE INDEX IF NOT EXISTS idx_lisensi_user ON Lisensi (user_id);
CREATE INDEX IF NOT EXISTS idx_lisensi_tanggal_habis ON Lisensi (tanggal_habis);
CREATE INDEX IF NOT EXISTS idx_pelanggan_added_user ON Pelanggan (added_user_id);