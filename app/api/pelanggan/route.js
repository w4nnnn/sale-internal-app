import { NextResponse } from "next/server";
import conn from "@/lib/conn";
import { z } from "zod";

const { all, run, get } = conn;

export const pelangganBodySchema = z.object({
	nama_pelanggan: z
		.string({ required_error: "Nama pelanggan wajib diisi." })
		.trim()
		.min(1, "Nama pelanggan wajib diisi."),
	email_pelanggan: z
		.string()
		.trim()
		.optional()
		.refine(
			(value) => !value || value.length === 0 || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
			"Email tidak valid."
		),
	perusahaan: z.string().trim().optional(),
	telepon_pelanggan: z.string().trim().optional(),
});

// Convert empty strings to null so SQLite stores optional fields as NULL.
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
			`SELECT pelanggan_id, nama_pelanggan, email_pelanggan, perusahaan, telepon_pelanggan
			 FROM Pelanggan
			 ORDER BY pelanggan_id DESC`
		);

		return NextResponse.json({ data });
	} catch (error) {
		return NextResponse.json(
			{ message: "Gagal mengambil data pelanggan.", details: error.message },
			{ status: 500 }
		);
	}
}

export async function POST(request) {
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

		const payload = parsed.data;
		const insertResult = run(
			`INSERT INTO Pelanggan (nama_pelanggan, email_pelanggan, perusahaan, telepon_pelanggan)
			 VALUES (@nama_pelanggan, @email_pelanggan, @perusahaan, @telepon_pelanggan)`,
			{
				nama_pelanggan: payload.nama_pelanggan.trim(),
				email_pelanggan: normalizeNullable(payload.email_pelanggan),
				perusahaan: normalizeNullable(payload.perusahaan),
				telepon_pelanggan: normalizeNullable(payload.telepon_pelanggan),
			}
		);

		const pelanggan = get(
			`SELECT pelanggan_id, nama_pelanggan, email_pelanggan, perusahaan, telepon_pelanggan
			 FROM Pelanggan
			 WHERE pelanggan_id = ?`,
			[insertResult.lastInsertRowid]
		);

		return NextResponse.json({ data: pelanggan }, { status: 201 });
	} catch (error) {
		return NextResponse.json(
			{ message: "Gagal menyimpan data pelanggan.", details: error.message },
			{ status: 500 }
		);
	}
}
