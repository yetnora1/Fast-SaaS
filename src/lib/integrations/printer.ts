import { vatFromInclusive, formatETB } from "@/lib/money";

/**
 * ESC/POS thermal printer adapter + ERCA-compliant receipt renderer.
 *
 * Supports 4 printer connection types:
 * - "browser"  → returns text for window.print() on the client
 * - "network"  → streams ESC/POS bytes to a TCP printer (IP:port)
 * - "usb"      → writes to USB device via escpos package (Node.js)
 * - "bluetooth" → returns ESC/POS bytes for Web Bluetooth on the client
 *
 * Printer config is stored in branch.settingsJson.printer:
 *   { type: "network", ip: "192.168.1.100", port: 9100 }
 *   { type: "usb", vendorId: 0x04b8, productId: 0x0202 }
 *   { type: "bluetooth" }
 *   { type: "browser" }  ← default
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

export interface PrinterConfig {
  type: "browser" | "network" | "usb" | "bluetooth";
  ip?: string;
  port?: number;       // default 9100 for network printers
  vendorId?: number;   // for USB
  productId?: number;  // for USB
}

const DEFAULT_CONFIG: PrinterConfig = { type: "browser" };

// ── Receipt text builder (ERCA-compliant) ────────────────────────────

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

// ── ESC/POS binary buffer ────────────────────────────────────────────

export function buildEscPos(d: ReceiptData): Buffer {
  const ESC = 0x1b;
  const GS = 0x1d;
  const init = Buffer.from([ESC, 0x40]); // Initialize printer
  const center_on = Buffer.from([ESC, 0x61, 0x01]); // Center alignment
  const left = Buffer.from([ESC, 0x61, 0x00]); // Left alignment
  const bold_on = Buffer.from([ESC, 0x45, 0x01]);
  const bold_off = Buffer.from([ESC, 0x45, 0x00]);
  const cut = Buffer.from([GS, 0x56, 0x00]); // Full cut
  const feed = Buffer.from([0x0a]); // Line feed

  const v = vatFromInclusive(d.total);
  const parts: Buffer[] = [init];

  // Header — centered, bold
  parts.push(center_on, bold_on);
  parts.push(Buffer.from(d.cafeName.toUpperCase() + "\n"));
  parts.push(bold_off);
  parts.push(Buffer.from(`TIN: ${d.tin}\n`));
  parts.push(Buffer.from(d.branch + "\n"));

  // Body — left aligned
  parts.push(left);
  parts.push(Buffer.from("-".repeat(32) + "\n"));
  parts.push(Buffer.from(`Receipt: ${d.orderId}\n`));
  parts.push(Buffer.from(`Date: ${d.createdAt.toLocaleString("en-GB")}\n`));
  parts.push(Buffer.from(`Cashier: ${d.cashier}\n`));
  parts.push(Buffer.from("-".repeat(32) + "\n"));

  for (const it of d.items) {
    const name = `${it.qty}x ${it.name}`.padEnd(20);
    const price = formatETB(it.lineTotal).padStart(12);
    parts.push(Buffer.from(name + price + "\n"));
  }

  parts.push(Buffer.from("-".repeat(32) + "\n"));
  parts.push(Buffer.from("Subtotal (net)".padEnd(20) + formatETB(v.subtotal).padStart(12) + "\n"));
  parts.push(Buffer.from(`VAT (${Math.round(v.vatRate * 100)}%)`.padEnd(20) + formatETB(v.vat).padStart(12) + "\n"));
  parts.push(bold_on);
  parts.push(Buffer.from("TOTAL".padEnd(20) + formatETB(v.total).padStart(12) + "\n"));
  parts.push(bold_off);
  parts.push(Buffer.from("-".repeat(32) + "\n"));
  parts.push(Buffer.from(`Paid via: ${d.method}\n`));

  // Footer — centered
  parts.push(center_on);
  parts.push(Buffer.from("Powered by CafeFlow\n"));
  parts.push(Buffer.from("ERCA-compliant VAT receipt\n"));

  // Feed and cut
  parts.push(feed, feed, feed, cut);

  return Buffer.concat(parts);
}

// ── Print dispatcher ─────────────────────────────────────────────────

export async function printReceipt(
  data: ReceiptData,
  config?: PrinterConfig | null,
): Promise<{ printed: boolean; method: string; bytes?: number; error?: string }> {
  const cfg = config ?? DEFAULT_CONFIG;

  switch (cfg.type) {
    case "network":
      return printViaNetwork(data, cfg);
    case "usb":
      return printViaUsb(data, cfg);
    case "bluetooth":
      // Bluetooth printing is handled client-side via Web Bluetooth API.
      // The backend just returns the ESC/POS bytes.
      return {
        printed: false,
        method: "bluetooth",
        bytes: buildEscPos(data).length,
        error: "Bluetooth printing is handled client-side. Use the returned escpos bytes.",
      };
    case "browser":
    default:
      // Browser printing is handled client-side via window.print().
      return { printed: false, method: "browser" };
  }
}

// ── Network printer (TCP raw socket to IP:port) ──────────────────────

async function printViaNetwork(
  data: ReceiptData,
  cfg: PrinterConfig,
): Promise<{ printed: boolean; method: string; bytes?: number; error?: string }> {
  const ip = cfg.ip;
  const port = cfg.port ?? 9100;

  if (!ip) {
    return { printed: false, method: "network", error: "No printer IP configured" };
  }

  const buffer = buildEscPos(data);

  try {
    // Dynamic import — only loads on the server (Node.js net module)
    const net = await import("net");
    await new Promise<void>((resolve, reject) => {
      const client = new net.Socket();
      client.setTimeout(5000);
      client.connect(port, ip, () => {
        client.write(buffer, (err) => {
          client.destroy();
          if (err) reject(err);
          else resolve();
        });
      });
      client.on("timeout", () => { client.destroy(); reject(new Error("Printer connection timed out")); });
      client.on("error", (err) => { client.destroy(); reject(err); });
    });
    return { printed: true, method: "network", bytes: buffer.length };
  } catch (e) {
    return { printed: false, method: "network", bytes: buffer.length, error: (e as Error).message };
  }
}

// ── USB printer (via escpos npm package) ─────────────────────────────

async function printViaUsb(
  data: ReceiptData,
  cfg: PrinterConfig,
): Promise<{ printed: boolean; method: string; bytes?: number; error?: string }> {
  const buffer = buildEscPos(data);

  try {
    // escpos is an optional dependency — only used when USB printing is configured
    const escpos = await import("escpos").catch(() => null);
    const escposUsb = await import("escpos-usb").catch(() => null);

    if (!escpos || !escposUsb) {
      return {
        printed: false,
        method: "usb",
        bytes: buffer.length,
        error: "USB printing requires 'escpos' and 'escpos-usb' packages. Install with: npm install escpos escpos-usb",
      };
    }

    const device = cfg.vendorId && cfg.productId
      ? new escposUsb.default(cfg.vendorId, cfg.productId)
      : new escposUsb.default();

    await new Promise<void>((resolve, reject) => {
      device.open((err: Error | null) => {
        if (err) return reject(err);
        device.write(buffer, (writeErr: Error | null) => {
          device.close();
          if (writeErr) reject(writeErr);
          else resolve();
        });
      });
    });

    return { printed: true, method: "usb", bytes: buffer.length };
  } catch (e) {
    return { printed: false, method: "usb", bytes: buffer.length, error: (e as Error).message };
  }
}

// ── Helpers ──────────────────────────────────────────────────────────

function center(s: string, width = 40): string {
  const pad = Math.max(0, Math.floor((width - s.length) / 2));
  return " ".repeat(pad) + s;
}

/** Parse printer config from branch settingsJson. */
export function parsePrinterConfig(settingsJson: unknown): PrinterConfig {
  if (!settingsJson || typeof settingsJson !== "object") return DEFAULT_CONFIG;
  const s = settingsJson as Record<string, unknown>;
  const printer = s.printer;
  if (!printer || typeof printer !== "object") return DEFAULT_CONFIG;
  const p = printer as Record<string, unknown>;
  const type = p.type;
  if (type === "network" || type === "usb" || type === "bluetooth" || type === "browser") {
    return {
      type,
      ip: typeof p.ip === "string" ? p.ip : undefined,
      port: typeof p.port === "number" ? p.port : undefined,
      vendorId: typeof p.vendorId === "number" ? p.vendorId : undefined,
      productId: typeof p.productId === "number" ? p.productId : undefined,
    };
  }
  return DEFAULT_CONFIG;
}
