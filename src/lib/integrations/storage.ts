import { promises as fs } from "fs";
import path from "path";
import os from "os";
import { config } from "@/lib/config";
import { put } from "@vercel/blob";

// Durable storage: when BLOB_READ_WRITE_TOKEN is set (Vercel Blob), files are
// stored there and survive redeploys. Local disk is dev-only — on serverless
// the filesystem is ephemeral and uploads WILL be lost without a blob token.
const useBlob = !!process.env.BLOB_READ_WRITE_TOKEN;

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];
const MAX_BYTES = 5 * 1024 * 1024;

async function saveFile(opts: {
  file: File;
  primaryDir: string;
  fallbackDir: string;
  namePrefix: string;
  allowedTypes: string[];
  maxSize: number;
}): Promise<string> {
  if (!opts.allowedTypes.includes(opts.file.type)) {
    throw new Error(`Invalid file type (${opts.allowedTypes.map(t => t.split('/')[1].toUpperCase()).join('/')} only)`);
  }
  if (opts.file.size > opts.maxSize) {
    throw new Error(`File too large (max ${Math.round(opts.maxSize / (1024 * 1024))}MB)`);
  }

  const ext = opts.file.type === "application/pdf" 
    ? "pdf" 
    : opts.file.type === "image/png" 
      ? "png" 
      : opts.file.type === "image/webp" 
        ? "webp" 
        : opts.file.type === "image/gif" 
          ? "gif" 
          : "jpg";
          
  const name = `${opts.namePrefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const buf = Buffer.from(await opts.file.arrayBuffer());

  if (useBlob) {
    const blob = await put(`${opts.fallbackDir}/${name}`, buf, {
      access: "public",
      contentType: opts.file.type,
    });
    return blob.url; // absolute, durable URL
  }

  try {
    const dir = path.resolve(opts.primaryDir);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, name), buf);
  } catch (err) {
    // Fallback to temp directory (e.g. on Vercel read-only filesystem)
    const dir = path.join(os.tmpdir(), "uploads", opts.fallbackDir);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, name), buf);
  }

  return `/uploads/${name}`;
}

export async function storeReceipt(file: File): Promise<{ url: string }> {
  const url = await saveFile({
    file,
    primaryDir: config.receiptStorageDir,
    fallbackDir: "receipts",
    namePrefix: "receipt",
    allowedTypes: ALLOWED,
    maxSize: MAX_BYTES,
  });
  return { url };
}

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const IMAGE_MAX = 4 * 1024 * 1024;

export async function storeMenuImage(file: File): Promise<{ url: string }> {
  const url = await saveFile({
    file,
    primaryDir: "public/uploads/menu",
    fallbackDir: "menu",
    namePrefix: "item",
    allowedTypes: IMAGE_TYPES,
    maxSize: IMAGE_MAX,
  });
  return { url };
}

export async function storeAvatar(file: File): Promise<{ url: string }> {
  const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  const url = await saveFile({
    file,
    primaryDir: "public/uploads/avatars",
    fallbackDir: "avatars",
    namePrefix: "avatar",
    allowedTypes: AVATAR_TYPES,
    maxSize: IMAGE_MAX,
  });
  return { url };
}


