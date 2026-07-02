import { handler, ok, fail } from "@/lib/api";
import { prisma } from "@/lib/db/client";
import { storeReceipt } from "@/lib/integrations/storage";
import { limitPublic } from "@/lib/rate-limit";

/**
 * Public endpoint for customers to upload a payment receipt image/PDF.
 * Returns the stored URL so the frontend can attach it to the order submission.
 */
export const POST = handler(async (req: Request, { params }: { params: { branchId: string } }) => {
  // Public upload — 10 files per IP per 10 minutes.
  const limited = limitPublic(req, "qr-receipt", 10, 10 * 60_000);
  if (limited) return limited;
  const branch = await prisma.branch.findUnique({ where: { id: params.branchId } });
  if (!branch) return fail("Branch not found", 404);

  const form = await req.formData();
  const file = form.get("receipt");
  if (!(file instanceof File)) return fail("Receipt file required (image or PDF)", 422);

  try {
    const { url } = await storeReceipt(file);
    return ok({ url });
  } catch (e) {
    return fail((e as Error).message, 422);
  }
});
