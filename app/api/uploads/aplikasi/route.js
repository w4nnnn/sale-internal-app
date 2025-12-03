import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import path from "path";
import fs from "fs/promises";

import { authOptions } from "@/lib/auth";
import {
  ensureUploadDirectory,
  sanitizeAppNameForFile,
  buildPublicPath,
  normalizeStoredFileName,
  fileExists,
} from "@/lib/aplikasi-files";

const allowedExtensions = new Map([
  [".apk", "application/vnd.android.package-archive"],
  [".ipa", "application/octet-stream"],
]);

export async function POST(request) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ message: "Tidak terautentikasi." }, { status: 401 });
  }

  if (session.user.role !== "admin") {
    return NextResponse.json({ message: "Akses ditolak." }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const files = formData
      .getAll("file")
      .filter((entry) => typeof entry === "object" && typeof entry.arrayBuffer === "function");

    if (files.length === 0) {
      return NextResponse.json({ message: "File wajib diunggah." }, { status: 400 });
    }

    if (files.length > 1) {
      return NextResponse.json({ message: "Unggah hanya satu file." }, { status: 400 });
    }

    const file = files[0];
    const appNameRaw = formData.get("appName");
    const previousPathRaw = formData.get("previousPath");

    if (typeof appNameRaw !== "string" || !appNameRaw.trim()) {
      return NextResponse.json(
        { message: "Nama aplikasi wajib diisi sebelum mengunggah file." },
        { status: 400 },
      );
    }

    const appName = appNameRaw.trim();
    const originalName = file.name || "file";
    const extension = path.extname(originalName).toLowerCase();

    if (!allowedExtensions.has(extension)) {
      return NextResponse.json({ message: "Format file tidak didukung." }, { status: 400 });
    }

    const uploadDir = await ensureUploadDirectory();
    const baseName = sanitizeAppNameForFile(appName);
    const fileName = `${baseName}${extension}`;
    const filePath = path.join(uploadDir, fileName);
    const normalizedPrevious = normalizeStoredFileName(previousPathRaw);
    const fileAlreadyExists = await fileExists(filePath);

    if (fileAlreadyExists && normalizedPrevious !== fileName) {
      return NextResponse.json(
        {
          message: "Nama file sudah digunakan. Gunakan nama aplikasi berbeda atau hapus file terkait terlebih dahulu.",
        },
        { status: 409 },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await fs.writeFile(filePath, buffer);

    const publicPath = buildPublicPath(fileName);

    return NextResponse.json(
      {
        data: {
          path: publicPath,
          fileName,
          originalName,
          mimeType: allowedExtensions.get(extension),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Gagal mengunggah file.", details: error.message },
      { status: 500 }
    );
  }
}
