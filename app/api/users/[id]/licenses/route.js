import { NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";

const dbPath = path.join(process.cwd(), process.env.DB_DIR, process.env.DB_File);
const db = new Database(dbPath);

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const userId = parseInt(id, 10);

    if (isNaN(userId)) {
      return NextResponse.json({ message: "ID pengguna tidak valid." }, { status: 400 });
    }

    // Query untuk mendapatkan lisensi dengan join ke aplikasi dan pelanggan
    const stmt = db.prepare(`
      SELECT
        l.lisensi_id,
        l.tanggal_mulai,
        l.tanggal_habis,
        l.status_lisensi,
        a.nama_app,
        p.nama_pelanggan
      FROM Lisensi l
      JOIN Aplikasi a ON l.app_id = a.app_id
      JOIN Pelanggan p ON l.pelanggan_id = p.pelanggan_id
      WHERE l.user_id = ?
      ORDER BY l.tanggal_habis DESC
    `);

    const licenses = stmt.all(userId);

    return NextResponse.json({
      data: licenses,
      message: "Lisensi berhasil dimuat.",
    });
  } catch (error) {
    console.error("Error fetching licenses:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan saat memuat lisensi." },
      { status: 500 }
    );
  }
}