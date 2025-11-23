const path = require("path");
const Database = require("better-sqlite3");
const bcrypt = require("bcrypt");
require("dotenv").config();

if (!process.env.DB_DIR || !process.env.DB_File) {
	console.error("Harap set DB_DIR dan DB_File di berkas .env sebelum menjalankan seeding.");
	process.exit(1);
}

const dbPath = path.join(process.env.DB_DIR, process.env.DB_File);
const db = new Database(dbPath);

const users = [
	{
		nama_user: "Admin Utama",
		email_user: "admin@example.com",
		telepon_user: null,
		password: "Admin123!",
		role: "admin",
	},
	{
		nama_user: "Sales Demo",
		email_user: "sales@example.com",
		telepon_user: null,
		password: "Sales123!",
		role: "sales",
	},
];

async function seed() {
	try {
		const insert = db.prepare(
			`INSERT INTO Users (nama_user, email_user, telepon_user, password_hash, role)
			 VALUES (@nama_user, @email_user, @telepon_user, @password_hash, @role)`
		);

		const findByEmail = db.prepare(`SELECT user_id FROM Users WHERE LOWER(email_user) = LOWER(?)`);

		for (const user of users) {
			const existing = findByEmail.get(user.email_user);
			if (existing) {
				console.log(`Lewat: ${user.email_user} sudah ada.`);
				continue;
			}

			const password_hash = await bcrypt.hash(user.password, 10);
			insert.run({
				nama_user: user.nama_user,
				email_user: user.email_user,
				telepon_user: user.telepon_user,
				password_hash,
				role: user.role,
			});
			console.log(`Tambah: ${user.email_user} (${user.role}).`);
		}

		console.log("Seeding user selesai.");
	} catch (error) {
		console.error("Gagal melakukan seeding user:", error);
		process.exitCode = 1;
	} finally {
		db.close();
	}
}

seed();
