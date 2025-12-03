import path from "path";
import fs from "fs/promises";

export const UPLOAD_SUBDIRECTORY = "aplikasi-files";
export const FILES_PUBLIC_PREFIX = "/files/";

const resolveStorageRoot = () => {
  const root = process.env.DB_DIR || "penyimpanan";
  return path.resolve(process.cwd(), root);
};

export const ensureUploadDirectory = async () => {
  const storageRoot = resolveStorageRoot();
  const uploadDir = path.resolve(storageRoot, UPLOAD_SUBDIRECTORY);
  await fs.mkdir(uploadDir, { recursive: true });
  return uploadDir;
};

export const sanitizeAppNameForFile = (value) => {
  if (!value || typeof value !== "string") {
    return "aplikasi";
  }

  const base = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

  return base || "aplikasi";
};

export const normalizeStoredFileName = (value) => {
  if (!value) {
    return null;
  }

  let raw = String(value).trim();

  if (!raw) {
    return null;
  }

  try {
    const url = new URL(raw);
    raw = url.pathname || "";
  } catch (error) {
    // Ignore URL parse errors, treat value as path
  }

  if (raw.startsWith(FILES_PUBLIC_PREFIX)) {
    raw = raw.slice(FILES_PUBLIC_PREFIX.length);
  }

  raw = raw.replace(/^\/+/, "");

  if (!raw || raw.includes("..") || raw.includes("\\") || path.isAbsolute(raw)) {
    return null;
  }

  return raw;
};

export const buildPublicPath = (fileName) => `${FILES_PUBLIC_PREFIX}${fileName}`;

export const fileExists = async (absolutePath) => {
  try {
    await fs.access(absolutePath);
    return true;
  } catch (error) {
    return false;
  }
};

export const deleteStoredFile = async (storedPath) => {
  const normalized = normalizeStoredFileName(storedPath);

  if (!normalized) {
    return;
  }

  const uploadDir = await ensureUploadDirectory();
  const absolutePath = path.resolve(uploadDir, normalized);

  if (!absolutePath.startsWith(uploadDir)) {
    return;
  }

  try {
    await fs.unlink(absolutePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
};
