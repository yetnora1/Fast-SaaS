import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { config } from "@/lib/config";

export async function GET(req: Request, { params }: { params: { filename: string } }) {
  const { filename } = params;
  
  // Resolve path to the configured receipt storage directory (e.g. ./.uploads)
  const dir = path.resolve(config.receiptStorageDir);
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
    return new NextResponse("File Not Found", { status: 404 });
  }
}
