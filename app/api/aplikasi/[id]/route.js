import { NextResponse } from "next/server";
import conn from "@/lib/conn";
import { aplikasiBodySchema, normalizeNullable } from "../route";

const { db, run, get } = conn;

const parseAppId = (params) => {
  const raw = params?.id;
  const id = Number(raw);

  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }

  return id;
};

export async function PUT(request, { params }) {
  const appId = parseAppId(params);

  if (!appId) {
    return NextResponse.json({ message: "ID aplikasi tidak valid." }, { status: 400 });
  }

  try {
    const body = await request.json();
    const parsed = aplikasiBodySchema.safeParse({
      nama_app: body.nama_app,
      tipe_app: body.tipe_app,
      deskripsi: body.deskripsi ?? undefined,
      link_web: body.link_web ?? undefined,
      path_ios: body.path_ios ?? undefined,
      path_android: body.path_android ?? undefined,
      pelanggan_id: body.pelanggan_id ?? undefined,
      user_id: body.user_id ?? undefined,
      tanggal_mulai: body.tanggal_mulai ?? undefined,
      tanggal_habis: body.tanggal_habis ?? undefined,
    });

    if (!parsed.success) {
      const issues = parsed.error.issues.map((issue) => issue.message);
      return NextResponse.json({ message: issues.join(" ") }, { status: 400 });
    }

    const existing = get(
      `SELECT app_id FROM Aplikasi WHERE app_id = ?`,
      [appId]
    );

    if (!existing) {
      return NextResponse.json({ message: "Aplikasi tidak ditemukan." }, { status: 404 });
    }

    const payload = parsed.data;
    const pelangganId = toNumberOrNull(payload.pelanggan_id);
    const userId = toNumberOrNull(payload.user_id);
    const tanggalMulai = payload.tanggal_mulai ?? null;
    const tanggalHabis = payload.tanggal_habis ?? null;

    const updateAppWithLicense = db.transaction(() => {
      run(
        `UPDATE Aplikasi
         SET nama_app = @nama_app,
             tipe_app = @tipe_app,
             deskripsi = @deskripsi,
             link_web = @link_web,
             path_ios = @path_ios,
             path_android = @path_android
         WHERE app_id = @app_id`,
        {
          app_id: appId,
          nama_app: payload.nama_app.trim(),
          tipe_app: payload.tipe_app,
          deskripsi: normalizeNullable(payload.deskripsi),
          link_web: normalizeNullable(payload.link_web),
          path_ios: normalizeNullable(payload.path_ios),
          path_android: normalizeNullable(payload.path_android),
        }
      );

      if (payload.tipe_app === "pelanggan" && pelangganId && userId && tanggalMulai && tanggalHabis) {
        const existingLicense = get(
          `SELECT lisensi_id FROM Lisensi WHERE app_id = ? ORDER BY tanggal_mulai DESC LIMIT 1`,
          [appId]
        );

        if (existingLicense) {
          run(
            `UPDATE Lisensi
             SET pelanggan_id = @pelanggan_id,
                 user_id = @user_id,
                 tanggal_mulai = @tanggal_mulai,
                 tanggal_habis = @tanggal_habis
             WHERE lisensi_id = @lisensi_id`,
            {
              lisensi_id: existingLicense.lisensi_id,
              pelanggan_id: pelangganId,
              user_id: userId,
              tanggal_mulai: tanggalMulai,
              tanggal_habis: tanggalHabis,
            }
          );
        } else {
          run(
            `INSERT INTO Lisensi (app_id, pelanggan_id, user_id, tanggal_mulai, tanggal_habis)
             VALUES (@app_id, @pelanggan_id, @user_id, @tanggal_mulai, @tanggal_habis)`,
            {
              app_id: appId,
              pelanggan_id: pelangganId,
              user_id: userId,
              tanggal_mulai: tanggalMulai,
              tanggal_habis: tanggalHabis,
            }
          );
        }
      } else {
        run(`DELETE FROM Lisensi WHERE app_id = ?`, [appId]);
      }
    });

    updateAppWithLicense();

    const aplikasi = get(
      `SELECT app_id, nama_app, tipe_app, deskripsi, link_web, path_ios, path_android
       FROM Aplikasi
       WHERE app_id = ?`,
      [appId]
    );

    return NextResponse.json({ data: aplikasi });
  } catch (error) {
    return NextResponse.json(
      { message: "Gagal memperbarui data aplikasi.", details: error.message },
      { status: 500 }
    );
  }
}

const toNumberOrNull = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numeric = Number(value);
  return Number.isNaN(numeric) ? null : numeric;
};

export async function DELETE(request, { params }) {
  const appId = parseAppId(params);

  if (!appId) {
    return NextResponse.json({ message: "ID aplikasi tidak valid." }, { status: 400 });
  }

  try {
    const existing = get(
      `SELECT app_id, nama_app FROM Aplikasi WHERE app_id = ?`,
      [appId]
    );

    if (!existing) {
      return NextResponse.json({ message: "Aplikasi tidak ditemukan." }, { status: 404 });
    }

    run(`DELETE FROM Aplikasi WHERE app_id = ?`, [appId]);

    return NextResponse.json({ message: "Aplikasi berhasil dihapus." }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Gagal menghapus data aplikasi.", details: error.message },
      { status: 500 }
    );
  }
}
