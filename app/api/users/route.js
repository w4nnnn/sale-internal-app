import { NextResponse } from "next/server";
import conn from "@/lib/conn";

const { all } = conn;

export async function GET() {
  try {
    const data = all(
      `SELECT user_id, nama_user, email_user, role
       FROM Users
       ORDER BY nama_user ASC`
    );

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { message: "Gagal mengambil data pengguna.", details: error.message },
      { status: 500 }
    );
  }
}
