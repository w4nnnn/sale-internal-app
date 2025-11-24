import { NextResponse } from "next/server";
import conn from "@/lib/conn";

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
  const params = context?.params ? await context.params : undefined;
  const appId = parseAppId(params);

  if (!appId) {
    return NextResponse.json({ message: "ID aplikasi tidak valid." }, { status: 400 });
  }

  try {
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
