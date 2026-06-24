import { handler, ok } from "@/lib/api";
import { clearSession, getSession } from "@/lib/auth/server";
import { audit } from "@/lib/audit";

export const POST = handler(async () => {
  const s = await getSession();
  await clearSession();
  if (s) await audit({ tenantId: s.tenantId, userId: s.sub, action: "auth.logout" });
  return ok({ loggedOut: true });
});
