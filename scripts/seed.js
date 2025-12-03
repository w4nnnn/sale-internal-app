const Database = require("better-sqlite3");
const path = require("path");
const bcrypt = require("bcrypt");
require("dotenv").config();

const dbDir = process.env.DB_DIR;
const dbFile = process.env.DB_File;

if (!dbDir || !dbFile) {
  console.error("Harap set DB_DIR dan DB_File di berkas .env sebelum menjalankan seeding.");
  process.exit(1);
}

const dbPath = path.join(dbDir, dbFile);
const db = new Database(dbPath);

db.pragma("foreign_keys = ON");

db.transaction(() => {
  const tables = ["Lisensi", "Pelanggan", "Aplikasi", "Users"];
  for (const table of tables) {
    db.prepare(`DELETE FROM ${table}`).run();
  }

  const hashedAdmin = bcrypt.hashSync("admin123", 10);
  const hashedAgen = bcrypt.hashSync("agen12345", 10);
  const hashedAgenTwo = bcrypt.hashSync("agen23456", 10);

  const insertUserStmt = db.prepare(`
    INSERT INTO Users (nama_user, username, email_user, telepon_user, password_hash, role)
    VALUES (@nama_user, @username, @email_user, @telepon_user, @password_hash, @role)
  `);

  insertUserStmt.run({
    nama_user: "Administrator",
    username: "admin",
    email_user: "admin@example.com",
    telepon_user: "+620000000001",
    password_hash: hashedAdmin,
    role: "admin",
  });

  const agenOne = insertUserStmt.run({
    nama_user: "Agen Utama",
    username: "agen1",
    email_user: "agen1@example.com",
    telepon_user: "+620000000002",
    password_hash: hashedAgen,
    role: "agen",
  });

  const agenTwo = insertUserStmt.run({
    nama_user: "Agen Cadangan",
    username: "agen2",
    email_user: "agen2@example.com",
    telepon_user: "+620000000003",
    password_hash: hashedAgenTwo,
    role: "agen",
  });

  const insertedUsers = db.prepare(`
    SELECT user_id, username FROM Users ORDER BY user_id ASC
  `).all();

  console.log("Users seeded:", insertedUsers);

  const insertPelangganStmt = db.prepare(`
    INSERT INTO Pelanggan (nama_pelanggan, email_pelanggan, perusahaan, telepon_pelanggan, added_user_id)
    VALUES (@nama_pelanggan, @email_pelanggan, @perusahaan, @telepon_pelanggan, @added_user_id)
  `);

  const pelangganOne = insertPelangganStmt.run({
    nama_pelanggan: "PT Maju Terus",
    email_pelanggan: "kontak@majutrus.co.id",
    perusahaan: "PT Maju Terus",
    telepon_pelanggan: "+620000100100",
    added_user_id: agenOne.lastInsertRowid,
  });

  const pelangganTwo = insertPelangganStmt.run({
    nama_pelanggan: "CV Hebat Selalu",
    email_pelanggan: "info@hebatselalu.com",
    perusahaan: "CV Hebat Selalu",
    telepon_pelanggan: "+620000200200",
    added_user_id: agenOne.lastInsertRowid,
  });

  const pelangganThree = insertPelangganStmt.run({
    nama_pelanggan: "UD Jaya Abadi",
    email_pelanggan: "cs@jayaabadi.id",
    perusahaan: "UD Jaya Abadi",
    telepon_pelanggan: "+620000300300",
    added_user_id: agenTwo.lastInsertRowid,
  });

  const insertAplikasiStmt = db.prepare(`
    INSERT INTO Aplikasi (nama_app, tipe_app, deskripsi, link_web, path_ios, path_android)
    VALUES (@nama_app, @tipe_app, @deskripsi, @link_web, @path_ios, @path_android)
  `);

  const appDemo = insertAplikasiStmt.run({
    nama_app: "Sales Demo",
    tipe_app: "demo",
    deskripsi: "Aplikasi demo untuk presentasi fitur.",
    link_web: "https://demo.internal.app",
    path_ios: "/files/demo_v1.ipa",
    path_android: "/files/demo_v1.apk",
  });

  const appPelangganOne = insertAplikasiStmt.run({
    nama_app: "Sales Force X",
    tipe_app: "pelanggan",
    deskripsi: "Aplikasi penjualan dengan integrasi WhatsApp.",
    link_web: "https://client1.salesapp.com",
    path_ios: "/files/salesforcex_v1.ipa",
    path_android: "/files/salesforcex_v1.apk",
  });

  const appPelangganTwo = insertAplikasiStmt.run({
    nama_app: "Inventory Master",
    tipe_app: "pelanggan",
    deskripsi: "Monitoring stok dan order secara real-time.",
    link_web: "https://client2.salesapp.com",
    path_ios: "/files/inventorymaster_v1.ipa",
    path_android: "/files/inventorymaster_v1.apk",
  });

  const insertLisensiStmt = db.prepare(`
    INSERT INTO Lisensi (app_id, pelanggan_id, user_id, tanggal_mulai, tanggal_habis, status_lisensi, pengingat_terkirim)
    VALUES (@app_id, @pelanggan_id, @user_id, @tanggal_mulai, @tanggal_habis, @status_lisensi, @pengingat_terkirim)
  `);

  const today = new Date();
  const addDays = (date, days) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d.toISOString().split("T")[0];
  };

  insertLisensiStmt.run({
    app_id: appPelangganOne.lastInsertRowid,
    pelanggan_id: pelangganOne.lastInsertRowid,
    user_id: agenOne.lastInsertRowid,
    tanggal_mulai: addDays(today, -90),
    tanggal_habis: addDays(today, 275),
    status_lisensi: "Aktif",
    pengingat_terkirim: 0,
  });

  insertLisensiStmt.run({
    app_id: appPelangganTwo.lastInsertRowid,
    pelanggan_id: pelangganTwo.lastInsertRowid,
    user_id: agenOne.lastInsertRowid,
    tanggal_mulai: addDays(today, -30),
    tanggal_habis: addDays(today, 150),
    status_lisensi: "Aktif",
    pengingat_terkirim: 0,
  });

  insertLisensiStmt.run({
    app_id: appPelangganTwo.lastInsertRowid,
    pelanggan_id: pelangganThree.lastInsertRowid,
    user_id: agenTwo.lastInsertRowid,
    tanggal_mulai: addDays(today, -120),
    tanggal_habis: addDays(today, -10),
    status_lisensi: "Habis",
    pengingat_terkirim: 1,
  });

  console.log("Seeding completed successfully.");
})();

db.close();
