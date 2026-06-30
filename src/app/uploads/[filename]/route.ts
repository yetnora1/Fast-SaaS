import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import os from "os";
import { config } from "@/lib/config";

export async function GET(req: Request, { params }: { params: { filename: string } }) {
  const { filename } = params;
  
  // We will search for the file in the following directories in order:
  const searchDirs = [
    path.resolve(config.receiptStorageDir),
    path.resolve("public/uploads/menu"),
    path.resolve("public/uploads/avatars"),
    path.join(os.tmpdir(), "uploads/receipts"),
    path.join(os.tmpdir(), "uploads/menu"),
    path.join(os.tmpdir(), "uploads/avatars"),
  ];

  for (const dir of searchDirs) {
    const filePath = path.join(dir, filename);
    try {
      const fileBuffer = await fs.readFile(filePath);
      
      // Determine the content type based on extension
      const ext = filename.split(".").pop()?.toLowerCase();
      let contentType = "application/octet-stream";
      if (ext === "jpg" || ext === "jpeg") {
        contentType = "image/jpeg";
      } else if (ext === "png") {
        contentType = "image/png";
      } else if (ext === "webp") {
        contentType = "image/webp";
      } else if (ext === "gif") {
        contentType = "image/gif";
      } else if (ext === "pdf") {
        contentType = "application/pdf";
      }

      return new NextResponse(fileBuffer, {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    } catch (error) {
      // Continue searching in next directory
    }
  }

  return new NextResponse("File Not Found", { status: 404 });
}

