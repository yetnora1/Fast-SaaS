import { handler, ok, fail } from "@/lib/api";
import { requireSession } from "@/lib/auth/server";
import { prisma } from "@/lib/db/client";
import { tenantDb } from "@/lib/db/tenant";
import { storeAvatar } from "@/lib/integrations/storage";

export const POST = handler(async (req: Request) => {
  const me = await requireSession();
  const db = me.tenantId ? tenantDb(me.tenantId) : prisma;

  const form = await req.formData();
  const file = form.get("avatar");
  if (!(file instanceof File)) return fail("Avatar image file required", 422);

  try {
    const { url } = await storeAvatar(file);

    // Save user avatar URL to db
    await db.user.update({
      where: { id: me.sub },
      data: { avatarUrl: url },
    });

    return ok({ url });
  } catch (e) {
    return fail((e as Error).message, 422);
  }
});
