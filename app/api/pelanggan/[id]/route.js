import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import conn from "@/lib/conn";
import { authOptions } from "@/lib/auth";
import { pelangganBodySchema, normalizeNullable } from "../route";

const { run, get } = conn;

const parsePelangganId = (params) => {
  const raw = params?.id;
  const id = Number(raw);

  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }

  return id;
};

const resolveParams = async (context) => {
  const value = context?.params;
  if (value && typeof value.then === "function") {
    return await value;
  }
  return value;
};

export async function PUT(request, context) {
  const params = await resolveParams(context);
  const pelangganId = parsePelangganId(params);

  if (!pelangganId) {
    return NextResponse.json({ message: "ID pelanggan tidak valid." }, { status: 400 });
  }

  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ message: "Tidak terautentikasi." }, { status: 401 });
  }

  const { role, id } = session.user;
  const userId = Number(id);

  if (Number.isNaN(userId)) {
    return NextResponse.json({ message: "Identitas pengguna tidak valid." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = pelangganBodySchema.safeParse({
      nama_pelanggan: body.nama_pelanggan,
      email_pelanggan: body.email_pelanggan ?? undefined,
      perusahaan: body.perusahaan ?? undefined,
      telepon_pelanggan: body.telepon_pelanggan ?? undefined,
    });

    if (!parsed.success) {
      const issues = parsed.error.issues.map((issue) => issue.message);
      return NextResponse.json({ message: issues.join(" ") }, { status: 400 });
    }

    const existing = get(
      `SELECT pelanggan_id, added_user_id
       FROM Pelanggan
       WHERE pelanggan_id = ?`,
      [pelangganId]
    );

    if (!existing) {
      return NextResponse.json({ message: "Pelanggan tidak ditemukan." }, { status: 404 });
    }

    if (role === "agen") {
      if (existing.added_user_id !== userId) {
        return NextResponse.json({ message: "Akses ditolak." }, { status: 403 });
      }
    } else if (role !== "admin") {
      return NextResponse.json({ message: "Akses ditolak." }, { status: 403 });
    }

    const payload = parsed.data;

    run(
      `UPDATE Pelanggan
       SET nama_pelanggan = @nama_pelanggan,
           email_pelanggan = @email_pelanggan,
           perusahaan = @perusahaan,
           telepon_pelanggan = @telepon_pelanggan
       WHERE pelanggan_id = @pelanggan_id`,
      {
        pelanggan_id: pelangganId,
        nama_pelanggan: payload.nama_pelanggan.trim(),
        email_pelanggan: normalizeNullable(payload.email_pelanggan),
        perusahaan: normalizeNullable(payload.perusahaan),
        telepon_pelanggan: normalizeNullable(payload.telepon_pelanggan),
      }
    );

    const pelanggan = get(
      `SELECT pelanggan_id, nama_pelanggan, email_pelanggan, perusahaan, telepon_pelanggan, added_user_id
       FROM Pelanggan
       WHERE pelanggan_id = ?`,
      [pelangganId]
    );

    return NextResponse.json({ data: pelanggan });
  } catch (error) {
    return NextResponse.json(
      { message: "Gagal memperbarui data pelanggan.", details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request, context) {
  const params = await resolveParams(context);
  const pelangganId = parsePelangganId(params);

  if (!pelangganId) {
    return NextResponse.json({ message: "ID pelanggan tidak valid." }, { status: 400 });
  }

  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ message: "Tidak terautentikasi." }, { status: 401 });
  }

  const { role, id } = session.user;
  const userId = Number(id);

  if (Number.isNaN(userId)) {
    return NextResponse.json({ message: "Identitas pengguna tidak valid." }, { status: 403 });
  }

  try {
    const existing = get(
      `SELECT pelanggan_id, nama_pelanggan, added_user_id
       FROM Pelanggan
       WHERE pelanggan_id = ?`,
      [pelangganId]
    );

    if (!existing) {
      return NextResponse.json({ message: "Pelanggan tidak ditemukan." }, { status: 404 });
    }

    if (role === "agen") {
      if (existing.added_user_id !== userId) {
        return NextResponse.json({ message: "Akses ditolak." }, { status: 403 });
      }
    } else if (role !== "admin") {
      return NextResponse.json({ message: "Akses ditolak." }, { status: 403 });
    }

    run(`DELETE FROM Pelanggan WHERE pelanggan_id = ?`, [pelangganId]);

    return NextResponse.json({ message: "Pelanggan berhasil dihapus." }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Gagal menghapus data pelanggan.", details: error.message },
      { status: 500 }
    );
  }
}
