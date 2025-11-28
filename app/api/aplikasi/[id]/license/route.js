import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import conn from "@/lib/conn";
import { authOptions } from "@/lib/auth";

const { get } = conn;

const parseAppId = (params) => {
  const raw = params?.id;
  const appId = Number(raw);

  if (!Number.isInteger(appId) || appId <= 0) {
    return null;
  }

  return appId;
};

export async function GET(request, context) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ message: "Tidak terautentikasi." }, { status: 401 });
  }

  const params = context?.params ? await context.params : undefined;
  const appId = parseAppId(params);

  if (!appId) {
    return NextResponse.json({ message: "ID aplikasi tidak valid." }, { status: 400 });
  }

  try {
    const application = get(
      `SELECT app_id, tipe_app FROM Aplikasi WHERE app_id = ?`,
      [appId]
    );

    if (!application) {
      return NextResponse.json({ message: "Aplikasi tidak ditemukan." }, { status: 404 });
    }

    if (session.user.role === "agen") {
      if (application.tipe_app === "demo") {
        // allowed
      } else if (application.tipe_app === "pelanggan") {
        const ownership = get(
          `SELECT lisensi_id FROM Lisensi WHERE app_id = ? AND user_id = ? LIMIT 1`,
          [appId, session.user.id]
        );

        if (!ownership) {
          return NextResponse.json({ message: "Akses ditolak." }, { status: 403 });
        }
      } else {
        return NextResponse.json({ message: "Akses ditolak." }, { status: 403 });
      }
    }

    const license = get(
      `SELECT lisensi_id, app_id, pelanggan_id, user_id, tanggal_mulai, tanggal_habis, status_lisensi
       FROM Lisensi
       WHERE app_id = ?
       ORDER BY tanggal_mulai DESC
       LIMIT 1`,
      [appId]
    );

    return NextResponse.json({ data: license ?? null });
  } catch (error) {
    return NextResponse.json(
      { message: "Gagal mengambil data lisensi.", details: error.message },
      { status: 500 }
    );
  }
}
