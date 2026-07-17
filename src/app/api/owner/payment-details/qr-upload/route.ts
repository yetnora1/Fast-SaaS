import { handler, ok, fail } from "@/lib/api";
import { requireTenant } from "@/lib/auth/server";
import { storeTelebirrQr } from "@/lib/integrations/storage";

// Telebirr receiving-QR image upload (multipart/form-data) → returns a public
// URL the payment-accounts form then saves as the tenant's telebirrQrUrl.
export const POST = handler(async (req: Request) => {
  await requireTenant("cafe_owner");
  const form = await req.formData();
  const file = form.get("image");
  if (!(file instanceof File)) return fail("Image file required", 422);
  try {
    const { url } = await storeTelebirrQr(file);
    return ok({ url });
  } catch (e) {
    return fail((e as Error).message, 422);
  }
});
