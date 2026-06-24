import { handler, ok } from "@/lib/api";
import { getSession } from "@/lib/auth/server";

export const GET = handler(async () => {
  const s = await getSession();
  return ok(s ? { id: s.sub, role: s.role, name: s.name, email: s.email, tenantId: s.tenantId, branchId: s.branchId } : null);
});
