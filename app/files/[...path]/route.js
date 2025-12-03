import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";

const mimeByExtension = new Map([
  [".apk", "application/vnd.android.package-archive"],
  [".ipa", "application/octet-stream"],
]);

const resolveStorageRoot = () => {
  const root = process.env.DB_DIR || "penyimpanan";
  return path.resolve(process.cwd(), root);
};

const resolveUploadDirectory = () => {
  return path.join(resolveStorageRoot(), "aplikasi-files");
};

export async function GET(request, context) {
  const paramsValue = context?.params;
  const resolvedParams = paramsValue && typeof paramsValue.then === "function"
    ? await paramsValue
    : paramsValue;

  const slug = resolvedParams?.path;

  if (!Array.isArray(slug) || slug.length === 0) {
    return NextResponse.json({ message: "File tidak ditemukan." }, { status: 404 });
  }

  const segments = slug[0] === "aplikasi" ? slug.slice(1) : [...slug];

  if (segments.length === 0) {
    return NextResponse.json({ message: "File tidak ditemukan." }, { status: 404 });
  }

  const requestedPath = path.join(...segments);

  const uploadDir = resolveUploadDirectory();
  const absolutePath = path.resolve(uploadDir, requestedPath);

  if (!absolutePath.startsWith(uploadDir)) {
    return NextResponse.json({ message: "File tidak ditemukan." }, { status: 404 });
  }

  try {
    const data = await fs.readFile(absolutePath);
    const extension = path.extname(absolutePath).toLowerCase();
    const mimeType = mimeByExtension.get(extension) || "application/octet-stream";
    const fileName = path.basename(absolutePath);

    return new NextResponse(data, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    if (error && (error.code === "ENOENT" || error.code === "ENAMETOOLONG")) {
      return NextResponse.json({ message: "File tidak ditemukan." }, { status: 404 });
    }

    return NextResponse.json(
      { message: "Gagal mengambil file.", details: error.message },
      { status: 500 }
    );
  }
}
