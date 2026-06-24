import { vatFromInclusive, formatETB } from "@/lib/money";

/**
 * ESC/POS thermal printer adapter + ERCA-compliant receipt renderer.
 *
 * STUBBED: generates the receipt text/ESC-POS byte buffer. In production, pipe
 * `buildEscPos()` to a USB/network thermal printer via the `escpos` package.
 */
export interface ReceiptData {
  cafeName: string;
  tin: string;
  branch: string;
  orderId: string;
  cashier: string;
  items: { name: string; qty: number; lineTotal: number }[];
  total: number; // VAT-inclusive
  method: string;
  createdAt: Date;
}

export function buildReceiptText(d: ReceiptData): string {
  const v = vatFromInclusive(d.total);
  const lines: string[] = [];
  lines.push(center(d.cafeName.toUpperCase()));
  lines.push(center(`TIN: ${d.tin}`));
  lines.push(center(d.branch));
  lines.push("-".repeat(40));
  lines.push(`Receipt: ${d.orderId}`);
  lines.push(`Date: ${d.createdAt.toLocaleString("en-GB")}`);
  lines.push(`Cashier: ${d.cashier}`);
  lines.push("-".repeat(40));
  for (const it of d.items) {
    lines.push(`${it.qty}x ${it.name}`.padEnd(28) + formatETB(it.lineTotal).padStart(12));
  }
  lines.push("-".repeat(40));
  lines.push("Subtotal (net)".padEnd(28) + formatETB(v.subtotal).padStart(12));
  lines.push(`VAT (${Math.round(v.vatRate * 100)}%)`.padEnd(28) + formatETB(v.vat).padStart(12));
  lines.push("TOTAL".padEnd(28) + formatETB(v.total).padStart(12));
  lines.push("-".repeat(40));
  lines.push(`Paid via: ${d.method}`);
  lines.push(center("Powered by CafeFlow"));
  lines.push(center("ERCA-compliant VAT receipt"));
  return lines.join("\n");
}

/** Minimal ESC/POS buffer (init + text + cut). */
export function buildEscPos(d: ReceiptData): Buffer {
  const ESC = 0x1b;
  const GS = 0x1d;
  const init = Buffer.from([ESC, 0x40]);
  const text = Buffer.from(buildReceiptText(d) + "\n\n\n", "ascii");
  const cut = Buffer.from([GS, 0x56, 0x00]);
  return Buffer.concat([init, text, cut]);
}

function center(s: string, width = 40): string {
  const pad = Math.max(0, Math.floor((width - s.length) / 2));
  return " ".repeat(pad) + s;
}
