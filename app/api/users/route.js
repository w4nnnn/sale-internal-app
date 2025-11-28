import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { z } from "zod";

import conn from "@/lib/conn";

const { all, get, run } = conn;

export const userBodySchema = z.object({
  nama_user: z
    .string({ required_error: "Nama user wajib diisi." })
    .trim()
    .min(1, "Nama user wajib diisi."),
  username: z
    .string({ required_error: "Username wajib diisi." })
    .trim()
    .min(3, "Username minimal 3 karakter.")
    .regex(/^\S+$/, "Username tidak boleh mengandung spasi."),
  email_user: z
    .string({ required_error: "Email wajib diisi." })
    .trim()
    .min(1, "Email wajib diisi.")
    .email("Format email tidak valid."),
  telepon_user: z.string().trim().optional(),
  role: z.enum(["agen", "admin"], {
    required_error: "Role wajib dipilih.",
  }),
});

export const normalizeNullable = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
};

export async function GET() {
  try {
    const data = all(
      `SELECT user_id, nama_user, username, email_user, telepon_user, role
       FROM Users
       ORDER BY user_id DESC`
    );

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { message: "Gagal mengambil data pengguna.", details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const parsed = userBodySchema.safeParse({
      nama_user: body.nama_user,
      username: body.username,
      email_user: body.email_user,
      telepon_user: body.telepon_user ?? undefined,
      role: body.role,
    });

    if (!parsed.success) {
      const issues = parsed.error.issues.map((issue) => issue.message);
      return NextResponse.json({ message: issues.join(" ") }, { status: 400 });
    }

    const payload = parsed.data;
    const password = typeof body.password === "string" ? body.password.trim() : "";

    if (password.length === 0) {
      return NextResponse.json(
        { message: "Kata sandi wajib diisi untuk pengguna baru." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { message: "Kata sandi minimal 8 karakter." },
        { status: 400 }
      );
    }

    const existingUsername = get(
      `SELECT user_id FROM Users WHERE LOWER(username) = LOWER(?)`,
      [payload.username]
    );

    if (existingUsername) {
      return NextResponse.json(
        { message: "Username sudah digunakan." },
        { status: 400 }
      );
    }

    const existingEmail = get(
      `SELECT user_id FROM Users WHERE LOWER(email_user) = LOWER(?)`,
      [payload.email_user]
    );

    if (existingEmail) {
      return NextResponse.json(
        { message: "Email sudah digunakan." },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const insertResult = run(
      `INSERT INTO Users (nama_user, username, email_user, telepon_user, password_hash, role)
       VALUES (@nama_user, @username, @email_user, @telepon_user, @password_hash, @role)`,
      {
        nama_user: payload.nama_user.trim(),
        username: payload.username.trim(),
        email_user: payload.email_user.trim(),
        telepon_user: normalizeNullable(payload.telepon_user),
        password_hash: passwordHash,
        role: payload.role,
      }
    );

    const user = get(
      `SELECT user_id, nama_user, username, email_user, telepon_user, role
       FROM Users
       WHERE user_id = ?`,
      [insertResult.lastInsertRowid]
    );

    return NextResponse.json({ data: user }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: "Gagal menyimpan data pengguna.", details: error.message },
      { status: 500 }
    );
  }
}
