/**
 * CafeFlow clean — wipes ALL tenant data (cafes, branches, staff, menus,
 * orders, inventory, suppliers, …) to leave a fresh, empty SaaS.
 *
 * Keeps only:
 *   - PlatformConfig (platform-level settings)
 *   - the SaaS owner / platform admin login
 *
 * Deleting each Tenant cascades to all of its related rows (onDelete: Cascade),
 * including its staff users. Any leftover non-saas_owner users are removed too.
 *
 *   npx tsx prisma/clean.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Cleaning CafeFlow — removing all cafes & roles…");

  const tenants = await prisma.tenant.findMany({ select: { id: true, name: true } });
  for (const t of tenants) {
    await prisma.tenant.delete({ where: { id: t.id } }); // cascades to all tenant data + staff
    console.log(`  removed tenant: ${t.name}`);
  }

  // Remove any remaining non-platform users (keep only saas_owner accounts).
  const removedUsers = await prisma.user.deleteMany({
    where: { role: { not: "saas_owner" } },
  });
  console.log(`  removed ${removedUsers.count} non-platform user(s)`);

  const owners = await prisma.user.findMany({
    where: { role: "saas_owner" },
    select: { email: true },
  });

  console.log("\nClean complete. Remaining state:");
  console.log(`  tenants: ${await prisma.tenant.count()}`);
  console.log(`  users:   ${await prisma.user.count()}`);
  console.table(owners);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
