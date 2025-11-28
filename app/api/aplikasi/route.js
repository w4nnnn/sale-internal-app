import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import conn from "@/lib/conn";
import { authOptions } from "@/lib/auth";

const { db, all, run, get } = conn;

const optionalIdSchema = z.union([z.string(), z.number()]).optional().nullable();

export const aplikasiBodySchema = z
	.object({
		nama_app: z
			.string({ required_error: "Nama aplikasi wajib diisi." })
			.trim()
			.min(1, "Nama aplikasi wajib diisi."),
		tipe_app: z.enum(["demo", "pelanggan", "admin"], {
			required_error: "Tipe aplikasi harus dipilih.",
		}),
		deskripsi: z.string().trim().optional(),
		link_web: z.string().trim().optional(),
		path_ios: z.string().trim().optional(),
		path_android: z.string().trim().optional(),
		pelanggan_id: optionalIdSchema,
		user_id: optionalIdSchema,
		tanggal_mulai: z.string().trim().optional().nullable(),
		tanggal_habis: z.string().trim().optional().nullable(),
	})
	.superRefine((data, ctx) => {
		if (data.tipe_app !== "pelanggan") {
			return;
		}

		const pelangganId = data.pelanggan_id;
		const userId = data.user_id;
		const tanggalMulai = data.tanggal_mulai;
		const tanggalHabis = data.tanggal_habis;

		if (pelangganId === undefined || pelangganId === null || String(pelangganId).trim() === "") {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["pelanggan_id"],
				message: "Pelanggan wajib dipilih.",
			});
		} else if (Number.isNaN(Number(pelangganId))) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["pelanggan_id"],
				message: "Pelanggan tidak valid.",
			});
		}

		if (userId === undefined || userId === null || String(userId).trim() === "") {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["user_id"],
				message: "User penanggung jawab wajib dipilih.",
			});
		} else if (Number.isNaN(Number(userId))) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["user_id"],
				message: "User tidak valid.",
			});
		}

		if (!tanggalMulai || tanggalMulai.trim().length === 0) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["tanggal_mulai"],
				message: "Tanggal mulai wajib diisi.",
			});
		}

		if (!tanggalHabis || tanggalHabis.trim().length === 0) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["tanggal_habis"],
				message: "Tanggal habis wajib diisi.",
			});
		}

		if (tanggalMulai && tanggalHabis) {
			const start = new Date(tanggalMulai);
			const end = new Date(tanggalHabis);

			if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ["tanggal_habis"],
					message: "Format tanggal tidak valid.",
				});
			} else if (start > end) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ["tanggal_habis"],
					message: "Tanggal habis harus setelah tanggal mulai.",
				});
			}
		}
	});

export const normalizeNullable = (value) => {
	if (value === undefined || value === null) {
		return null;
	}

	const trimmed = value.trim();
	return trimmed.length === 0 ? null : trimmed;
};

const toNumberOrNull = (value) => {
	if (value === undefined || value === null || value === "") {
		return null;
	}

	const numeric = Number(value);
	return Number.isNaN(numeric) ? null : numeric;
};

export async function GET() {
	const session = await getServerSession(authOptions);

	if (!session?.user) {
		return NextResponse.json({ message: "Tidak terautentikasi." }, { status: 401 });
	}

	const { role, id: userId } = session.user;

	try {
		let data;

		if (role === "admin") {
			data = all(
				`SELECT app_id, nama_app, tipe_app, deskripsi, link_web, path_ios, path_android
				 FROM Aplikasi
				 ORDER BY app_id DESC`
			);
		} else if (role === "agen") {
			data = all(
				`SELECT a.app_id, a.nama_app, a.tipe_app, a.deskripsi, a.link_web, a.path_ios, a.path_android
				 FROM Aplikasi a
				 LEFT JOIN Lisensi l
					 ON l.app_id = a.app_id
					AND l.lisensi_id = (
								SELECT lisensi_id
								FROM Lisensi
								WHERE app_id = a.app_id
								ORDER BY tanggal_mulai DESC, lisensi_id DESC
								LIMIT 1
					)
				 WHERE a.tipe_app = 'demo'
						OR (a.tipe_app = 'pelanggan' AND l.user_id = ?)
				 ORDER BY a.app_id DESC`,
				[userId]
			);
		} else {
			return NextResponse.json({ data: [] }, { status: 200 });
		}

		return NextResponse.json({ data });
	} catch (error) {
		return NextResponse.json(
			{ message: "Gagal mengambil data aplikasi.", details: error.message },
			{ status: 500 }
		);
	}
}

export async function POST(request) {
	const session = await getServerSession(authOptions);

	if (!session?.user) {
		return NextResponse.json({ message: "Tidak terautentikasi." }, { status: 401 });
	}

	if (session.user.role !== "admin") {
		return NextResponse.json({ message: "Akses ditolak." }, { status: 403 });
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

		const payload = parsed.data;
		const pelangganId = toNumberOrNull(payload.pelanggan_id);
		const userId = toNumberOrNull(payload.user_id);
		const tanggalMulai = payload.tanggal_mulai ?? null;
		const tanggalHabis = payload.tanggal_habis ?? null;

		const createAppWithLicense = db.transaction(() => {
			const insertResult = run(
				`INSERT INTO Aplikasi (nama_app, tipe_app, deskripsi, link_web, path_ios, path_android)
				 VALUES (@nama_app, @tipe_app, @deskripsi, @link_web, @path_ios, @path_android)`,
				{
					nama_app: payload.nama_app.trim(),
					tipe_app: payload.tipe_app,
					deskripsi: normalizeNullable(payload.deskripsi),
					link_web: normalizeNullable(payload.link_web),
					path_ios: normalizeNullable(payload.path_ios),
					path_android: normalizeNullable(payload.path_android),
				}
			);

			const newAppId = insertResult.lastInsertRowid;

			if (payload.tipe_app === "pelanggan" && pelangganId && userId && tanggalMulai && tanggalHabis) {
				run(
					`INSERT INTO Lisensi (app_id, pelanggan_id, user_id, tanggal_mulai, tanggal_habis)
					 VALUES (@app_id, @pelanggan_id, @user_id, @tanggal_mulai, @tanggal_habis)`,
					{
						app_id: newAppId,
						pelanggan_id: pelangganId,
						user_id: userId,
						tanggal_mulai: tanggalMulai,
						tanggal_habis: tanggalHabis,
					}
				);
			}

			return newAppId;
		});

		const appId = createAppWithLicense();

		const aplikasi = get(
			`SELECT app_id, nama_app, tipe_app, deskripsi, link_web, path_ios, path_android
			 FROM Aplikasi
			 WHERE app_id = ?`,
			[appId]
		);

		return NextResponse.json({ data: aplikasi }, { status: 201 });
	} catch (error) {
		return NextResponse.json(
			{ message: "Gagal menyimpan data aplikasi.", details: error.message },
			{ status: 500 }
		);
	}
}

export async function PUT(request) {
	const session = await getServerSession(authOptions);

	if (!session?.user) {
		return NextResponse.json({ message: "Tidak terautentikasi." }, { status: 401 });
	}

	if (session.user.role !== "admin") {
		return NextResponse.json({ message: "Akses ditolak." }, { status: 403 });
	}

	try {
		const body = await request.json();
		const appId = Number(body.app_id);

		if (!appId || Number.isNaN(appId)) {
			return NextResponse.json(
				{ message: "ID aplikasi wajib diisi." },
				{ status: 400 }
			);
		}

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
