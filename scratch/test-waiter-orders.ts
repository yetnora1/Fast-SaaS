import { prisma } from "../src/lib/db/client";

async function run() {
  const waiterId = "cmr3mh8yy000w2ksgh5pp3kin"; // cafe_owner ID
  const tenantId = "cmr3mh1kb00022ksgsey6ot49";
  
  try {
    const orders = await prisma.order.findMany({
      where: { tenantId, waiterId, status: { notIn: ["COMPLETED", "CANCELLED", "DECLINED"] } },
      include: { items: { include: { menuItem: true } }, table: true },
      orderBy: { createdAt: "desc" },
    });
    console.log("Found orders count:", orders.length);
  } catch (e) {
    console.error("Prisma error:", e);
  }
}

run().catch(console.error);
