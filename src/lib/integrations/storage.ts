import { promises as fs } from "fs";
import path from "path";
import os from "os";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/db/client";

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

  if (!useBlob) {
    try {
      await prisma.storedFile.create({
        data: {
          filename: name,
          mime: opts.file.type,
          data: buf,
        },
      });
    } catch (dbErr) {
      console.error("Failed to save to database storage", dbErr);
    }
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

/**
 * Store a payment receipt (customer transfer proof or subscription receipt).
 *
 * Receipts are persisted as bytes in the database so they survive on serverless
 * hosts that have no durable filesystem and no blob store configured. They are
 * served back on demand — with the original bytes/type — from /api/receipts/[id].
 */
export async function storeReceipt(file: File): Promise<{ url: string }> {
  if (!ALLOWED.includes(file.type)) {
    throw new Error(`Invalid file type (${ALLOWED.map((t) => t.split("/")[1].toUpperCase()).join("/")} only)`);
  }
  if (file.size > MAX_BYTES) {
    throw new Error(`File too large (max ${Math.round(MAX_BYTES / (1024 * 1024))}MB)`);
  }
  const data = Buffer.from(await file.arrayBuffer());
  const receipt = await prisma.receipt.create({ data: { mime: file.type, data } });
  return { url: `/api/receipts/${receipt.id}` };
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

/** The cafe's real Telebirr receiving QR code image (shown to payers at the cashier / QR checkout). */
export async function storeTelebirrQr(file: File): Promise<{ url: string }> {
  const url = await saveFile({
    file,
    primaryDir: "public/uploads/payment",
    fallbackDir: "payment",
    namePrefix: "telebirr_qr",
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


