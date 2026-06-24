import { Prisma } from "@prisma/client";
import { config } from "@/lib/config";

export type Money = Prisma.Decimal | number | string;

export function toNum(v: Money): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") return parseFloat(v);
  return v.toNumber();
}

/** Ethiopian VAT (15%) breakdown. Prices are VAT-inclusive in ETB. */
export interface VatBreakdown {
  subtotal: number; // pre-VAT (net)
  vat: number;
  total: number; // VAT-inclusive
  vatRate: number;
}

/** Compute VAT from a VAT-inclusive total (ERCA receipts show net + VAT). */
export function vatFromInclusive(total: number, rate = config.vatRate): VatBreakdown {
  const net = total / (1 + rate);
  const vat = total - net;
  return { subtotal: round2(net), vat: round2(vat), total: round2(total), vatRate: rate };
}

export function lineTotal(unitPrice: Money, qty: number, extras = 0): number {
  return round2((toNum(unitPrice) + extras) * qty);
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function formatETB(v: Money): string {
  return new Intl.NumberFormat("en-ET", { style: "currency", currency: "ETB", minimumFractionDigits: 2 }).format(toNum(v));
}
