import { handler, ok, fail } from "@/lib/api";
import { requireTenant } from "@/lib/auth/server";
import { storeMenuImage } from "@/lib/integrations/storage";

// Menu item photo upload (multipart/form-data) → returns a public URL the
// add/edit form then saves as the item's imageUrl.
export const POST = handler(async (req: Request) => {
  await requireTenant("cafe_owner", "cafe_manager");
  const form = await req.formData();
  const file = form.get("image");
  if (!(file instanceof File)) return fail("Image file required", 422);
  try {
    const { url } = await storeMenuImage(file);
    return ok({ url });
  } catch (e) {
    return fail((e as Error).message, 422);
  }
});
