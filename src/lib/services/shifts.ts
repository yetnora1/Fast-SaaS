import { prisma } from "@/lib/db/client";
import { round2, toNum } from "@/lib/money";
import { notifyTenantOwner } from "./notifications";
import { config } from "@/lib/config";

export async function openShift(branchId: string, openedBy: string, openingFloat: number) {
  const existing = await prisma.shift.findFirst({ where: { branchId, status: "OPEN" } });
  if (existing) throw new Error("A shift is already open for this branch");
  return prisma.shift.create({ data: { branchId, openedBy, openingFloat } });
}

/** calculate_shift_totals() equivalent — aggregate cash + digital for a shift. */
export async function shiftTotals(shiftId: string) {
  const payments = await prisma.payment.findMany({ where: { shiftId, status: "CONFIRMED" } });
  const sum = (m: string) => payments.filter((p) => p.method === m).reduce((s, p) => s + toNum(p.amount), 0);
  const cash = sum("CASH");
  const telebirr = sum("TELEBIRR");
  const cbe = sum("CBE_BIRR");
  return { cash: round2(cash), telebirr: round2(telebirr), cbe: round2(cbe), total: round2(cash + telebirr + cbe), count: payments.length };
}

export async function closeShift(shiftId: string, actualCash: number) {
  const shift = await prisma.shift.findUnique({ where: { id: shiftId }, include: { branch: true } });
  if (!shift || shift.status === "CLOSED") throw new Error("Shift not open");

  const totals = await shiftTotals(shiftId);
  const expectedCash = round2(toNum(shift.openingFloat) + totals.cash);
  const variance = round2(actualCash - expectedCash);

  const updated = await prisma.shift.update({
    where: { id: shiftId },
    data: { status: "CLOSED", closeTime: new Date(), actualCash, expectedCash, variance },
  });

  // Cash discrepancy > 50 ETB auto-notifies the Cafe Owner (spec §5.4).
  if (Math.abs(variance) > 50) {
    await notifyTenantOwner(
      shift.branch.tenantId,
      "cash_discrepancy",
      "Cash discrepancy on shift close",
      `Branch ${shift.branch.name}: expected ${expectedCash} ETB, counted ${actualCash} ETB, variance ${variance} ETB.`,
    );
  }
  return { shift: updated, totals, expectedCash, variance };
}

export const VARIANCE_THRESHOLD = 50;
export const PO_APPROVAL_THRESHOLD = config.poApprovalThreshold;
