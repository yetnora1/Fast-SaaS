import { handler, fail } from "@/lib/api";
import { requireTenant } from "@/lib/auth/server";
import { prisma } from "@/lib/db/client";
import { NextResponse } from "next/server";

/**
 * GET /api/equipment/export?format=csv|pdf
 * Accepts same filter params as the list endpoint.
 * Exports the FILTERED view, not the full table.
 */
export const GET = handler(async (req: Request) => {
  const me = await requireTenant("cafe_manager", "cafe_owner");
  const url = new URL(req.url);

  const format = url.searchParams.get("format") ?? "csv";
  if (format !== "csv" && format !== "pdf") return fail("format must be csv or pdf", 400);

  const department = url.searchParams.get("department") || undefined;
  const category = url.searchParams.get("category") || undefined;
  const condition = url.searchParams.get("condition") || undefined;
  const search = url.searchParams.get("search") || undefined;

  const where: any = { tenantId: me.tenantId, isActive: true };
  if (department) where.department = department;
  if (category) where.category = category;
  if (condition) where.condition = condition;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { notes: { contains: search, mode: "insensitive" } },
    ];
  }

  const items = await prisma.equipmentItem.findMany({
    where,
    orderBy: { updatedAt: "desc" },
  });

  // Build filter summary for PDF header
  const filters: string[] = [];
  if (department) filters.push(`Department: ${department}`);
  if (category) filters.push(`Category: ${category}`);
  if (condition) filters.push(`Condition: ${condition}`);
  if (search) filters.push(`Search: "${search}"`);

  const fmtDate = (d: Date | null) => (d ? d.toISOString().split("T")[0] : "");
  const condLabel: Record<string, string> = {
    NEW: "New", GOOD: "Good", WORN: "Worn", NEEDS_REPAIR: "Needs Repair", RETIRED: "Retired",
  };
  const deptLabel: Record<string, string> = {
    BARISTA: "Barista", KITCHEN: "Kitchen", SHARED: "Shared",
  };

  if (format === "csv") {
    const header = "Name,Category,Department,Quantity,Condition,Storage Area,Purchase Date,Last Maintenance,Notes";
    const rows = items.map((i) =>
      [
        csvEscape(i.name),
        csvEscape(i.category),
        deptLabel[i.department] ?? i.department,
        i.quantity,
        condLabel[i.condition] ?? i.condition,
        csvEscape(i.storageArea ?? ""),
        fmtDate(i.purchaseDate),
        fmtDate(i.lastMaintenance),
        csvEscape(i.notes ?? ""),
      ].join(","),
    );
    const csv = [header, ...rows].join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="equipment_${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  }

  // PDF — generate a minimal valid PDF document
  const now = new Date().toISOString().replace("T", " ").slice(0, 19);
  const filterSummary = filters.length ? filters.join(" | ") : "All equipment";
  const pdf = buildPdf(`Equipment Registry Report`, now, filterSummary, items, deptLabel, condLabel, fmtDate);
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="equipment_${new Date().toISOString().split("T")[0]}.pdf"`,
    },
  });
});

function csvEscape(s: string): string {
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * Build a minimal valid PDF with a table.
 * No external dependencies — just raw PDF structure.
 */
function buildPdf(
  title: string,
  generatedAt: string,
  filterSummary: string,
  items: any[],
  deptLabel: Record<string, string>,
  condLabel: Record<string, string>,
  fmtDate: (d: Date | null) => string,
): Buffer {
  // We'll build a simple text-based PDF with fixed-width columns.
  const lines: string[] = [];
  lines.push(title);
  lines.push(`Generated: ${generatedAt}`);
  lines.push(`Filters: ${filterSummary}`);
  lines.push(`Total items: ${items.length}`);
  lines.push("");
  lines.push(
    padR("Name", 25) +
    padR("Category", 20) +
    padR("Dept", 10) +
    padR("Qty", 6) +
    padR("Condition", 16) +
    padR("Storage", 15) +
    padR("Purchased", 12) +
    "Maintained",
  );
  lines.push("-".repeat(116));

  for (const item of items) {
    lines.push(
      padR(trunc(item.name, 24), 25) +
      padR(trunc(item.category, 19), 20) +
      padR(deptLabel[item.department] ?? item.department, 10) +
      padR(String(item.quantity), 6) +
      padR(condLabel[item.condition] ?? item.condition, 16) +
      padR(trunc(item.storageArea ?? "-", 14), 15) +
      padR(fmtDate(item.purchaseDate) || "-", 12) +
      (fmtDate(item.lastMaintenance) || "-"),
    );
  }

  const textContent = lines.join("\n");

  // Build minimal PDF 1.4
  const objects: string[] = [];
  const offsets: number[] = [];
  let pos = 0;

  const add = (obj: string) => {
    offsets.push(pos);
    objects.push(obj);
    pos += Buffer.byteLength(obj, "latin1");
  };

  const header = "%PDF-1.4\n";
  pos = Buffer.byteLength(header, "latin1");

  // Obj 1: Catalog
  add("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
  // Obj 2: Pages
  add("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");
  // Obj 3: Page — wider landscape for table
  add("3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n");
  // Obj 5: Font
  add("5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>\nendobj\n");

  // Obj 4: Stream content — render text lines
  const textLines = textContent.split("\n");
  let stream = "BT\n/F1 8 Tf\n";
  let yPos = 570;
  for (const line of textLines) {
    if (yPos < 30) break; // simple page overflow guard
    const escaped = line.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
    stream += `1 0 0 1 30 ${yPos} Tm\n(${escaped}) Tj\n`;
    yPos -= 11;
  }
  stream += "ET\n";

  const streamBytes = Buffer.byteLength(stream, "latin1");
  add(`4 0 obj\n<< /Length ${streamBytes} >>\nstream\n${stream}endstream\nendobj\n`);

  // Cross-reference table
  const xrefOffset = pos + Buffer.byteLength(header, "latin1");
  let xref = `xref\n0 ${offsets.length + 1}\n`;
  xref += "0000000000 65535 f \n";
  let runningPos = Buffer.byteLength(header, "latin1");
  for (let i = 0; i < offsets.length; i++) {
    xref += String(runningPos).padStart(10, "0") + " 00000 n \n";
    runningPos += Buffer.byteLength(objects[i], "latin1");
  }

  const trailer = `trailer\n<< /Size ${offsets.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  const fullPdf = header + objects.join("") + xref + trailer;
  return Buffer.from(fullPdf, "latin1");
}

function padR(s: string, len: number): string {
  return s.length >= len ? s.slice(0, len) : s + " ".repeat(len - s.length);
}

function trunc(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}
