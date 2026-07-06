import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";

/**
 * Serve a stored receipt (payment proof) by id, with its original bytes and
 * content-type. Auth is enforced by middleware (a valid session is required);
 * same-origin <img>/<iframe> requests carry the session cookie automatically.
 */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const receipt = await prisma.receipt.findUnique({ where: { id: params.id } });
  if (!receipt) return new NextResponse("Receipt not found", { status: 404 });

  return new NextResponse(new Uint8Array(receipt.data), {
    headers: {
      "Content-Type": receipt.mime,
      "Content-Disposition": "inline",
      "Cache-Control": "private, max-age=86400, immutable",
    },
  });
}
