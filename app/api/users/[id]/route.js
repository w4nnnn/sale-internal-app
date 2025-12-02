import { NextResponse } from "next/server";
import bcrypt from "bcrypt";

import conn from "@/lib/conn";
import { userBodySchema, normalizeNullable } from "../route";

const { get, run } = conn;

const parseUserId = (params) => {
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
	const userId = parseUserId(params);

	if (!userId) {
		return NextResponse.json({ message: "ID pengguna tidak valid." }, { status: 400 });
	}

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

		const existing = get(
			`SELECT user_id FROM Users WHERE user_id = ?`,
			[userId]
		);

		if (!existing) {
			return NextResponse.json({ message: "Pengguna tidak ditemukan." }, { status: 404 });
		}

		const payload = parsed.data;
		const passwordInput = typeof body.password === "string" ? body.password.trim() : "";

		if (passwordInput.length > 0 && passwordInput.length < 8) {
			return NextResponse.json(
				{ message: "Kata sandi minimal 8 karakter." },
				{ status: 400 }
			);
		}

		const existingUsername = get(
			`SELECT user_id FROM Users WHERE LOWER(username) = LOWER(?) AND user_id != ?`,
			[payload.username, userId]
		);

		if (existingUsername) {
			return NextResponse.json(
				{ message: "Username sudah digunakan." },
				{ status: 400 }
			);
		}

		const existingEmail = get(
			`SELECT user_id FROM Users WHERE LOWER(email_user) = LOWER(?) AND user_id != ?`,
			[payload.email_user, userId]
		);

		if (existingEmail) {
			return NextResponse.json(
				{ message: "Email sudah digunakan." },
				{ status: 400 }
			);
		}

		const updateParams = {
			user_id: userId,
			nama_user: payload.nama_user.trim(),
			username: payload.username.trim(),
			email_user: payload.email_user.trim(),
			telepon_user: normalizeNullable(payload.telepon_user),
			role: payload.role,
		};

		if (passwordInput.length > 0) {
			updateParams.password_hash = await bcrypt.hash(passwordInput, 10);
		}

		const updateQuery = passwordInput.length > 0
			? `UPDATE Users
				 SET nama_user = @nama_user,
				     username = @username,
				     email_user = @email_user,
				     telepon_user = @telepon_user,
				     role = @role,
				     password_hash = @password_hash
				 WHERE user_id = @user_id`
			: `UPDATE Users
				 SET nama_user = @nama_user,
				     username = @username,
				     email_user = @email_user,
				     telepon_user = @telepon_user,
				     role = @role
				 WHERE user_id = @user_id`;

		run(updateQuery, updateParams);

		const user = get(
			`SELECT user_id, nama_user, username, email_user, telepon_user, role
			 FROM Users
			 WHERE user_id = ?`,
			[userId]
		);

		return NextResponse.json({ data: user });
	} catch (error) {
		return NextResponse.json(
			{ message: "Gagal memperbarui data pengguna.", details: error.message },
			{ status: 500 }
		);
	}
}

export async function DELETE(request, context) {
	const params = await resolveParams(context);
	const userId = parseUserId(params);

	if (!userId) {
		return NextResponse.json({ message: "ID pengguna tidak valid." }, { status: 400 });
	}

	try {
		const existing = get(
			`SELECT user_id, nama_user FROM Users WHERE user_id = ?`,
			[userId]
		);

		if (!existing) {
			return NextResponse.json({ message: "Pengguna tidak ditemukan." }, { status: 404 });
		}

		run(`DELETE FROM Users WHERE user_id = ?`, [userId]);

		return NextResponse.json({ message: "Pengguna berhasil dihapus." }, { status: 200 });
	} catch (error) {
		if (error && typeof error.message === "string" && error.message.includes("FOREIGN KEY")) {
			return NextResponse.json(
				{
					message: "Pengguna tidak dapat dihapus karena masih digunakan pada data lain.",
					details: error.message,
				},
				{ status: 400 }
			);
		}

		return NextResponse.json(
			{ message: "Gagal menghapus data pengguna.", details: error.message },
			{ status: 500 }
		);
	}
}
