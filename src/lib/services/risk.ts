import { prisma } from "@/lib/db/client";

export interface RiskCheckResult {
  passed: boolean;
  flags: string[]; // "HIGH_VALUE", "LOW_STOCK", "FIRST_TIME_QR"
}

export async function runRiskCheck(orderId: string): Promise<RiskCheckResult> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: { include: { menuItem: true } },
      branch: true,
    },
  });
  
  if (!order) {
    throw new Error("Order not found for risk check");
  }

  const flags: string[] = [];

  // 1. Get threshold from branch settings
  let threshold = 500.00;
  if (order.branch.settingsJson && typeof order.branch.settingsJson === "object") {
    const settings = order.branch.settingsJson as Record<string, any>;
    if (typeof settings.autoConfirmThreshold === "number") {
      threshold = settings.autoConfirmThreshold;
    }
  }

  // Calculate order total
  let total = 0;
  for (const it of order.items) {
    const extras = Array.isArray(it.modifiersJson)
      ? (it.modifiersJson as any[]).reduce((s, m) => s + (Number(m.extraPrice) || 0), 0)
      : 0;
    const itemTotal = (Number(it.unitPrice) + extras) * it.quantity;
    total += itemTotal;
  }

  if (total > threshold) {
    flags.push("HIGH_VALUE");
  }

  // 2. Check for Low Stock
  const lowStockItems = await prisma.inventoryItem.findMany({
    where: {
      branchId: order.branchId,
      tenantId: order.tenantId,
    },
  });

  const lowStockNames = lowStockItems
    .filter((i) => Number(i.quantity) <= Number(i.minThreshold))
    .map((i) => i.name.toLowerCase().trim());

  if (lowStockNames.length > 0) {
    const hasLowStockItem = order.items.some((it) => {
      const name = it.menuItem.name.toLowerCase().trim();
      return lowStockNames.some((lowName) => name.includes(lowName) || lowName.includes(name));
    });
    if (hasLowStockItem) {
      flags.push("LOW_STOCK");
    }
  }

  // 3. Check for First-Time QR table session
  if (order.type === "QR" && order.tableId) {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const existingCompleted = await prisma.order.findFirst({
      where: {
        branchId: order.branchId,
        tableId: order.tableId,
        status: "COMPLETED",
        createdAt: { gte: twoHoursAgo },
        id: { not: orderId },
      },
    });
    if (!existingCompleted) {
      flags.push("FIRST_TIME_QR");
    }
  }

  return {
    passed: flags.length === 0,
    flags,
  };
}
