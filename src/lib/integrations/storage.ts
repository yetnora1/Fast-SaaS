import { promises as fs } from "fs";
import path from "path";
import { config } from "@/lib/config";

/**
 * File storage adapter for receipt uploads.
 * Stores uploaded files on local disk; the file path/URL is recorded in MySQL
 * (e.g. subscriptions.receipt_url). Validates type (jpg/png/pdf) and size (<=5MB).
 */
const ALLOWED = ["image/jpeg", "image/png", "application/pdf"];
const MAX_BYTES = 5 * 1024 * 1024;

export async function storeReceipt(file: File): Promise<{ url: string }> {
  if (!ALLOWED.includes(file.type)) throw new Error("Invalid file type (JPG/PNG/PDF only)");
  if (file.size > MAX_BYTES) throw new Error("File too large (max 5MB)");

  const dir = path.resolve(config.receiptStorageDir);
  await fs.mkdir(dir, { recursive: true });
  const ext = file.type === "application/pdf" ? "pdf" : file.type === "image/png" ? "png" : "jpg";
  const name = `receipt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(dir, name), buf);
  return { url: `/uploads/${name}` };
}

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const IMAGE_MAX = 4 * 1024 * 1024;

/**
 * Menu item photo. Stored under public/uploads/menu so Next serves it
 * statically at /uploads/menu/<name> for display on menus and the order screen.
 */
export async function storeMenuImage(file: File): Promise<{ url: string }> {
  if (!IMAGE_TYPES.includes(file.type)) throw new Error("Invalid image type (JPG/PNG/WEBP only)");
  if (file.size > IMAGE_MAX) throw new Error("Image too large (max 4MB)");

  const dir = path.resolve("public/uploads/menu");
  await fs.mkdir(dir, { recursive: true });
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const name = `item_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(dir, name), buf);
  return { url: `/uploads/menu/${name}` };
}
