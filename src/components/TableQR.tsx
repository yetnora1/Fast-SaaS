"use client";
import { useEffect, useState } from "react";
import { api, usePoll } from "@/components/fetcher";
import { useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import QRCode from "qrcode";

export interface CafeTableRow {
  id: string;
  branchId?: string;
  number: number;
  status: string;
  capacity: number;
  orders?: { id: string }[];
}

const STATUS_DOT: Record<string, string> = {
  available: "bg-status-green",
  occupied: "bg-status-occupied",
  attention: "bg-status-red",
  dirty: "bg-brand-muted",
};
const STATUS_BTN: Record<string, string> = {
  available: "border-status-green/40 bg-status-green/10 text-status-green",
  occupied: "border-status-occupied/40 bg-status-occupied/10 text-status-occupied",
  attention: "border-status-red/40 bg-status-red/10 text-status-red",
  dirty: "border-brand-border bg-brand-surface2 text-brand-muted",
};
const EDIT_ROLES = ["cafe_manager", "cafe_owner"];

/**
 * Waiter table picker — replaces the old 2D floor map with a simple
 * status-colored grid. Tap a table to start / add to an order.
 */
export function TableGrid({ onTableSelect }: { onTableSelect: (t: CafeTableRow) => void }) {
  const { statusLabel } = useLang();
  const poll = usePoll<{ tables: CafeTableRow[] }>("/api/manager/tables", 5000);
  const tables = poll.data?.tables ?? [];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 text-xs text-brand-muted">
        {Object.keys(STATUS_DOT).map((s) => (
          <span key={s} className="inline-flex items-center gap-1.5">
            <span className={cn("h-2 w-2 rounded-full", STATUS_DOT[s])} />
            {statusLabel(s)}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
        {tables.map((t) => (
          <button
            key={t.id}
            onClick={() => onTableSelect(t)}
            className={cn(
              "flex flex-col items-center gap-0.5 rounded-2xl border p-4 transition-all hover:scale-[1.03] active:scale-95",
              STATUS_BTN[t.status] ?? STATUS_BTN.dirty,
            )}
          >
            <span className="font-display text-lg font-bold">T{t.number}</span>
            <span className="text-[11px] opacity-80">{t.capacity} seats</span>
          </button>
        ))}
        {poll.error && tables.length === 0 && (
          <div className="col-span-full py-8 text-center text-sm text-brand-muted">Could not load tables.</div>
        )}
      </div>
    </div>
  );
}

/**
 * Table QR codes panel — the customer self-ordering QR for every table, with
 * print-all, per-table print/download, and simple add/remove table management
 * for managers and owners. (The 2D floor map was removed; QR only.)
 */
export function TableQRCodes({ branchId }: { branchId?: string }) {
  const query = branchId ? `?branchId=${branchId}` : "";
  const poll = usePoll<{ tables: CafeTableRow[]; cafeName?: string | null }>(`/api/manager/tables${query}`, 0);
  const me = usePoll<{ role: string; branchId?: string } | null>("/api/auth/me", 0);
  const canEdit = !!me.data && EDIT_ROLES.includes(me.data.role);
  const cafeName = poll.data?.cafeName || "Our Cafe";

  const [tables, setTables] = useState<CafeTableRow[]>([]);
  const [qrDataUrls, setQrDataUrls] = useState<Record<string, string>>({});
  const [printTables, setPrintTables] = useState<CafeTableRow[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (poll.data) setTables(poll.data.tables);
  }, [poll.data]);

  // Generate high-contrast QR data URLs whenever the table set changes.
  useEffect(() => {
    if (!tables.length) return;
    const origin = window.location.origin;
    const activeBranchId = branchId || tables[0]?.branchId || me.data?.branchId || "";
    const urls: Record<string, string> = {};
    Promise.all(
      tables.map(async (table) => {
        try {
          urls[table.id] = await QRCode.toDataURL(`${origin}/qr/${activeBranchId}?table=${table.number}`, {
            width: 300,
            margin: 1,
            color: { dark: "#000000", light: "#ffffff" },
          });
        } catch (err) {
          console.error("Error generating QR", err);
        }
      }),
    ).then(() => setQrDataUrls(urls));
  }, [tables, me.data, branchId]);

  const handlePrint = (list: CafeTableRow[]) => {
    setPrintTables(list);
    setTimeout(() => window.print(), 150);
  };

  const handleDownload = (table: CafeTableRow) => {
    const dataUrl = qrDataUrls[table.id];
    if (!dataUrl) return;
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `table-${table.number}-qr.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleView = (table: CafeTableRow) => {
    const dataUrl = qrDataUrls[table.id];
    if (!dataUrl) return;
    const w = window.open();
    if (w) {
      w.document.write(`
        <html>
          <head>
            <title>Table ${table.number} QR Code</title>
            <style>
              body {
                margin: 0;
                background: #0b0f19;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                color: white;
              }
              .card {
                background: #111827;
                padding: 32px;
                border-radius: 24px;
                border: 1px solid rgba(255,255,255,0.08);
                box-shadow: 0 20px 50px rgba(0,0,0,0.6);
                display: flex;
                flex-direction: column;
                align-items: center;
                text-align: center;
              }
              h1 {
                margin: 0;
                font-size: 24px;
                font-weight: 800;
                letter-spacing: 0.05em;
                background: linear-gradient(135deg, #a78bfa, #818cf8);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                text-transform: uppercase;
              }
              .sub {
                color: #9ca3af;
                margin: 6px 0 24px 0;
                font-size: 13px;
                font-weight: 500;
                letter-spacing: 0.02em;
              }
              .qr-box {
                background: white;
                padding: 16px;
                border-radius: 16px;
                display: flex;
                align-items: center;
                justify-content: center;
              }
              img {
                width: 280px;
                height: 280px;
                display: block;
              }
            </style>
          </head>
          <body>
            <div class="card">
              <h1>TABLE ${table.number}</h1>
              <div class="sub">Welcome to ZAD Cafe</div>
              <div class="qr-box">
                <img src="${dataUrl}" />
              </div>
            </div>
          </body>
        </html>
      `);
      w.document.close();
    }
  };

  async function addTable() {
    setBusy(true);
    try {
      const res = await api<{ table: CafeTableRow }>("/api/manager/tables", { method: "POST", body: JSON.stringify({ branchId }) });
      setTables((ts) => [...ts, res.table]);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function removeTable(id: string, number: number) {
    if (!window.confirm(`Remove table ${number}?`)) return;
    try {
      await api(`/api/manager/tables/${id}${query}`, { method: "DELETE" });
      setTables((ts) => ts.filter((t) => t.id !== id));
    } catch (e) {
      alert((e as Error).message);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-brand-muted">Print or download high-contrast QR codes for customer self-ordering.</p>
        <div className="flex items-center gap-2">
          {canEdit && (
            <button
              onClick={addTable}
              disabled={busy}
              className="rounded-xl bg-brand-surface2 px-3 py-1.5 text-xs font-semibold text-brand-foreground transition-colors hover:bg-white/10 disabled:opacity-50"
            >
              + Add table
            </button>
          )}
          <button
            onClick={() => handlePrint(tables)}
            disabled={!tables.length}
            className="rounded-xl bg-brand-accent px-4 py-2 text-xs font-semibold text-brand-accentFg shadow-card transition-colors hover:bg-brand-accentHover disabled:opacity-50"
          >
            🖨️ Print All Tickets
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {tables.map((table) => {
          const hasQR = !!qrDataUrls[table.id];
          return (
            <div
              key={table.id}
              className="relative flex flex-col items-center justify-between rounded-xl border border-brand-border/60 bg-brand-bg/40 p-4 transition-all hover:border-brand-border"
            >
              {canEdit && (
                <button
                  onClick={() => removeTable(table.id, table.number)}
                  className="absolute right-2 top-2 rounded-md px-1.5 text-brand-muted transition-colors hover:bg-status-red/15 hover:text-status-red"
                  title="Remove table"
                  aria-label={`Remove table ${table.number}`}
                >
                  ✕
                </button>
              )}
              <div className="text-center flex flex-col items-center gap-1.5">
                <span className="font-display text-xs font-bold uppercase tracking-wider text-brand-muted">Table {table.number}</span>
                <div className="inline-flex rounded-full bg-brand-accent/10 px-2.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-brand-accent">
                  Welcome to ZAD Cafe
                </div>
              </div>

              <div className="my-4 flex h-36 w-36 items-center justify-center rounded-lg bg-white p-2">
                {hasQR ? (
                  <img src={qrDataUrls[table.id]} className="h-full w-full object-contain" alt={`Table ${table.number} QR`} />
                ) : (
                  <div className="text-xs text-slate-400">Generating...</div>
                )}
              </div>

              <div className="flex w-full gap-1.5 mt-1">
                <button
                  onClick={() => handleView(table)}
                  disabled={!hasQR}
                  className="flex-1 rounded-xl bg-brand-surface2 py-2 text-xxs font-semibold text-brand-foreground transition-all hover:bg-white/10 active:scale-[0.97] disabled:opacity-50"
                >
                  👁️ View
                </button>
                <button
                  onClick={() => handleDownload(table)}
                  disabled={!hasQR}
                  className="rounded-xl bg-brand-surface2 p-2 text-xxs transition-all hover:bg-white/10 active:scale-[0.97] disabled:opacity-50"
                  title="Download QR"
                  aria-label="Download QR"
                >
                  💾
                </button>
              </div>
            </div>
          );
        })}
        {!tables.length && (
          <div className="col-span-full py-8 text-center text-sm text-brand-muted">
            {poll.error ? "Could not load tables." : "No tables yet."}
          </div>
        )}
      </div>

      {/* Print-only container */}
      <div id="cf-print-area" className="hidden">
        {printTables.map((table) => {
          const origin = typeof window !== "undefined" ? window.location.origin : "";
          const activeBranchId = branchId || table.branchId || tables[0]?.branchId || me.data?.branchId || "";
          const qrUrl = `${origin}/qr/${activeBranchId}?table=${table.number}`;
          return (
            <div
              key={table.id}
              className="page-break flex flex-col items-center justify-between p-10 text-center bg-white text-black border border-gray-200"
              style={{ minHeight: "100vh", pageBreakAfter: "always" }}
            >
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                  <span className="text-xl">☕</span>
                </div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900">{cafeName}</h1>
                <div className="h-[2px] w-16 bg-[#c87a53] my-2" />
                <h2 className="text-4xl font-extrabold text-slate-800 uppercase tracking-tight mt-1">TABLE {table.number}</h2>
              </div>

              <div className="flex flex-col items-center my-6">
                <div className="border-4 border-slate-950 p-4 bg-white shadow-md rounded-xl">
                  {qrDataUrls[table.id] && (
                    <img src={qrDataUrls[table.id]} style={{ width: "240px", height: "240px" }} alt={`Table ${table.number} QR`} />
                  )}
                </div>
                <div className="mt-4 flex items-center gap-1.5 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  <span>📱 Scan to Order</span>
                  <span>·</span>
                  <span>ይቃኙ እና ያዝዙ 📱</span>
                </div>
              </div>

              <div className="border-t border-dashed border-slate-300 pt-6 w-72 text-center flex flex-col gap-3">
                <div className="text-[12px] font-medium leading-relaxed text-slate-850">
                  <p className="font-bold text-slate-900">Scan to access the menu items</p>
                  <p className="text-slate-500 mt-0.5 font-normal">Browse our menu and place your order directly from your phone.</p>
                </div>
                <div className="text-[12px] font-medium leading-relaxed text-slate-850">
                  <p className="font-bold text-slate-900">የምግብ ዝርዝሩን ለመመልከት ይህንን ይቃኙ</p>
                  <p className="text-slate-500 mt-0.5 font-normal">ከተቀመጡበት ሆነው ምናሌውን በመመልከት ቀጥታ ማዘዝ ይችላሉ።</p>
                </div>
              </div>

              <div className="mt-4">
                <p className="text-[9px] text-gray-400 font-mono break-all max-w-xs opacity-75">{qrUrl}</p>
                <p className="text-[8px] text-gray-400 mt-1 uppercase tracking-widest">Powered by CafeFlow</p>
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        @media print {
          body > :not(#cf-print-area) {
            display: none !important;
          }
          #cf-print-area {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
}
