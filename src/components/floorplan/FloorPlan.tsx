"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, usePoll } from "@/components/fetcher";
import { useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { FloorScene } from "./scene";
import type { FloorTable, TableShape, TableStatus } from "./types";
import QRCode from "qrcode";

const SHAPES: TableShape[] = ["round", "square", "rectangle", "booth"];
const SHAPE_ICON: Record<TableShape, string> = { round: "●", square: "■", rectangle: "▬", booth: "🛋" };
const STATUSES: TableStatus[] = ["available", "occupied", "attention", "dirty"];
const STATUS_DOT: Record<string, string> = {
  available: "bg-status-green",
  occupied: "bg-status-occupied",
  attention: "bg-status-red",
  dirty: "bg-brand-muted",
};
const EDIT_ROLES = ["cafe_manager", "cafe_owner"];

export interface FloorPlanProps {
  /** Tap action in view mode (e.g. waiter → new order). */
  onTableSelect?: (table: FloorTable) => void;
  /** Allow the layout editor (still gated by role). Default true. */
  allowEdit?: boolean;
  /** Hide floating labels (e.g. while a modal is open above the canvas). */
  paused?: boolean;
  height?: number;
}

export default function FloorPlan({ onTableSelect, allowEdit = true, paused = false, height = 480 }: FloorPlanProps) {
  const { statusLabel } = useLang();
  const [editMode, setEditMode] = useState(false);
  const [tables, setTables] = useState<FloorTable[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [save, setSave] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const tablesRef = useRef<FloorTable[]>([]);
  tablesRef.current = tables;

  // Pause polling while editing so live updates don't clobber in-progress edits.
  const poll = usePoll<{ tables: FloorTable[] }>(editMode ? null : "/api/manager/tables", 5000);
  const me = usePoll<{ role: string; branchId?: string } | null>("/api/auth/me", 0);
  const canEdit = allowEdit && !!me.data && EDIT_ROLES.includes(me.data.role);

  const [showQRModal, setShowQRModal] = useState(false);
  const [qrDataUrls, setQrDataUrls] = useState<Record<string, string>>({});
  const [printTables, setPrintTables] = useState<FloorTable[]>([]);

  useEffect(() => {
    if (poll.data && !editMode) setTables(poll.data.tables);
  }, [poll.data, editMode]);

  useEffect(() => {
    if (showQRModal && tables.length) {
      const origin = window.location.origin;
      const activeBranchId = tables[0]?.branchId || me.data?.branchId || "";
      const urls: Record<string, string> = {};
      Promise.all(
        tables.map(async (table) => {
          const qrUrl = `${origin}/qr/${activeBranchId}?table=${table.number}`;
          try {
            const dataUrl = await QRCode.toDataURL(qrUrl, {
              width: 300,
              margin: 1,
              color: {
                dark: "#000000",
                light: "#ffffff",
              },
            });
            urls[table.id] = dataUrl;
          } catch (err) {
            console.error("Error generating QR", err);
          }
        }),
      ).then(() => {
        setQrDataUrls(urls);
      });
    }
  }, [showQRModal, tables, me.data]);

  const handlePrintSingle = (table: FloorTable) => {
    setPrintTables([table]);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const handlePrintAll = () => {
    setPrintTables(tables);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const handleDownload = (table: FloorTable) => {
    const dataUrl = qrDataUrls[table.id];
    if (!dataUrl) return;
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `table-${table.number}-qr.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const selected = tables.find((t) => t.id === selectedId) ?? null;

  const persist = useCallback(async (id: string, patch: Partial<FloorTable>) => {
    setSave("saving");
    try {
      await api(`/api/manager/tables/${id}`, { method: "PATCH", body: JSON.stringify(patch) });
      setSave("saved");
      setTimeout(() => setSave("idle"), 1200);
    } catch {
      setSave("error");
    }
  }, []);

  // Optimistic local edit + persist (shape / seats / status / rotation).
  const edit = useCallback(
    (id: string, patch: Partial<FloorTable>) => {
      setTables((ts) => ts.map((t) => (t.id === id ? { ...t, ...patch } : t)));
      persist(id, patch);
    },
    [persist],
  );

  const addTable = useCallback(async () => {
    setSave("saving");
    try {
      const res = await api<{ table: FloorTable }>("/api/manager/tables", { method: "POST", body: "{}" });
      setTables((ts) => [...ts, res.table]);
      setSelectedId(res.table.id);
      setSave("saved");
      setTimeout(() => setSave("idle"), 1200);
    } catch {
      setSave("error");
    }
  }, []);

  const removeTable = useCallback(async (id: string) => {
    if (!window.confirm("Remove this table from the floor?")) return;
    setSave("saving");
    try {
      await api(`/api/manager/tables/${id}`, { method: "DELETE" });
      setTables((ts) => ts.filter((t) => t.id !== id));
      setSelectedId(null);
      setSave("saved");
      setTimeout(() => setSave("idle"), 1200);
    } catch (e) {
      setSave("error");
      alert((e as Error).message);
    }
  }, []);

  const handleSelect = useCallback(
    (id: string) => {
      if (editMode) {
        setSelectedId(id);
      } else {
        const t = tablesRef.current.find((x) => x.id === id);
        if (t) onTableSelect?.(t);
      }
    },
    [editMode, onTableSelect],
  );

  const dragMove = useCallback((x: number, y: number) => {
    setSelectedId((sid) => {
      if (sid) setTables((ts) => ts.map((t) => (t.id === sid ? { ...t, xPos: x, yPos: y } : t)));
      return sid;
    });
  }, []);

  const dragEnd = useCallback(() => {
    setDragging(false);
    const t = tablesRef.current.find((x) => x.id === selectedId);
    if (t) persist(t.id, { xPos: Math.round(t.xPos), yPos: Math.round(t.yPos) });
  }, [selectedId, persist]);

  const toggleEdit = () => {
    setEditMode((e) => !e);
    setSelectedId(null);
    setDragging(false);
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-brand-border/70 bg-brand-bg shadow-card">
      <div style={{ height }} className="w-full touch-none">
        <FloorScene
          tables={tables}
          selectedId={editMode ? selectedId : null}
          editMode={editMode}
          dragging={dragging}
          hideLabels={paused}
          onSelect={handleSelect}
          onDragStart={() => setDragging(true)}
          onDragMove={dragMove}
          onDragEnd={dragEnd}
          onClearSelect={() => editMode && !dragging && setSelectedId(null)}
        />
      </div>

      {/* Top bar: legend + edit toggle */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
        <div className="pointer-events-auto flex flex-wrap items-center gap-2 rounded-xl bg-black/45 px-2.5 py-1.5 text-xs text-white backdrop-blur-sm">
          {STATUSES.map((s) => (
            <span key={s} className="inline-flex items-center gap-1">
              <span className={cn("h-2 w-2 rounded-full", STATUS_DOT[s])} />
              {statusLabel(s)}
            </span>
          ))}
        </div>
        {canEdit && (
          <div className="pointer-events-auto flex items-center gap-2">
            {!editMode && (
              <button
                onClick={() => setShowQRModal(true)}
                className="rounded-xl bg-black/55 px-3 py-1.5 text-xs font-semibold text-white shadow-card transition-colors hover:bg-black/70 flex items-center gap-1.5"
              >
                <span>🖨️</span>
                <span>QR Codes</span>
              </button>
            )}
            {editMode && (
              <button
                onClick={addTable}
                className="rounded-xl bg-black/55 px-3 py-1.5 text-xs font-semibold text-white shadow-card transition-colors hover:bg-black/70"
              >
                + Add table
              </button>
            )}
            <button
              onClick={toggleEdit}
              className={cn(
                "rounded-xl px-3 py-1.5 text-xs font-semibold shadow-card transition-colors",
                editMode ? "bg-brand-accent text-brand-accentFg" : "bg-black/55 text-white hover:bg-black/70",
              )}
            >
              {editMode ? "✓ Done" : "✎ Edit layout"}
            </button>
          </div>
        )}
      </div>

      {/* Hint + save state while editing */}
      {editMode && (
        <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg bg-black/55 px-2.5 py-1.5 text-[11px] text-white/90 backdrop-blur-sm">
          Drag tables to move · tap to select
          {save === "saving" && <span className="ml-2 text-brand-accent">saving…</span>}
          {save === "saved" && <span className="ml-2 text-status-green">saved ✓</span>}
          {save === "error" && <span className="ml-2 text-status-red">save failed</span>}
        </div>
      )}

      {/* Editor panel */}
      {editMode && selected && (
        <div className="absolute bottom-3 right-3 w-60 space-y-3 rounded-2xl border border-brand-border bg-brand-surface/95 p-3 text-sm shadow-pop backdrop-blur">
          <div className="flex items-center justify-between">
            <span className="font-display font-bold">Table {selected.number}</span>
            <button onClick={() => setSelectedId(null)} className="text-brand-muted hover:text-white" aria-label="Close">
              ✕
            </button>
          </div>

          <div>
            <div className="mb-1 text-xs text-brand-muted">Shape</div>
            <div className="grid grid-cols-4 gap-1.5">
              {SHAPES.map((s) => (
                <button
                  key={s}
                  onClick={() => edit(selected.id, { shape: s })}
                  title={s}
                  className={cn(
                    "rounded-lg py-1.5 text-base transition-colors",
                    selected.shape === s ? "bg-brand-accent text-brand-accentFg" : "bg-brand-surface2 hover:bg-white/10",
                  )}
                >
                  {SHAPE_ICON[s]}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-brand-muted">Seats</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => edit(selected.id, { capacity: Math.max(1, selected.capacity - 1) })}
                className="h-7 w-7 rounded-lg bg-brand-surface2 text-lg leading-none hover:bg-white/10"
              >
                −
              </button>
              <span className="tabular w-6 text-center font-bold">{selected.capacity}</span>
              <button
                onClick={() => edit(selected.id, { capacity: Math.min(20, selected.capacity + 1) })}
                className="h-7 w-7 rounded-lg bg-brand-surface2 text-lg leading-none hover:bg-white/10"
              >
                +
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-brand-muted">Rotate</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => edit(selected.id, { rotation: (selected.rotation ?? 0) - 15 })}
                className="h-7 w-7 rounded-lg bg-brand-surface2 hover:bg-white/10"
              >
                ⟲
              </button>
              <button
                onClick={() => edit(selected.id, { rotation: (selected.rotation ?? 0) + 15 })}
                className="h-7 w-7 rounded-lg bg-brand-surface2 hover:bg-white/10"
              >
                ⟳
              </button>
            </div>
          </div>

          <div>
            <div className="mb-1 text-xs text-brand-muted">Status</div>
            <div className="grid grid-cols-2 gap-1.5">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => edit(selected.id, { status: s })}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs transition-colors",
                    selected.status === s ? "bg-brand-surface2 ring-1 ring-brand-accent" : "bg-brand-surface2/60 hover:bg-white/10",
                  )}
                >
                  <span className={cn("h-2 w-2 rounded-full", STATUS_DOT[s])} />
                  {statusLabel(s)}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => removeTable(selected.id)}
            className="w-full rounded-lg border border-status-red/40 bg-status-red/10 py-1.5 text-xs font-semibold text-status-red transition-colors hover:bg-status-red/20"
          >
            🗑 Remove table
          </button>
        </div>
      )}

      {poll.error && !tables.length && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-brand-muted">
          Could not load tables.
        </div>
      )}

      {showQRModal && (
        <div className="fixed inset-0 z-modal flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-fade">
          <div className="relative flex max-h-[85vh] w-full max-w-4xl flex-col rounded-2xl border border-brand-border bg-brand-surface text-brand-foreground shadow-pop">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-brand-border/70 px-6 py-4">
              <div>
                <h3 className="font-display text-lg font-bold text-[#c87a53]">Table QR Codes</h3>
                <p className="text-xs text-brand-muted">Print or download high-contrast QR codes for customer self-ordering.</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handlePrintAll}
                  className="rounded-xl bg-brand-accent px-4 py-2 text-xs font-semibold text-brand-accentFg shadow-button transition-colors hover:bg-brand-accent/90"
                >
                  🖨️ Print All Tickets
                </button>
                <button
                  onClick={() => setShowQRModal(false)}
                  className="text-brand-muted hover:text-white text-lg p-1.5"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="grid grid-cols-2 gap-4 p-6 overflow-y-auto sm:grid-cols-3 md:grid-cols-4">
              {tables.map((table) => {
                const hasQR = !!qrDataUrls[table.id];
                return (
                  <div
                    key={table.id}
                    className="flex flex-col items-center justify-between rounded-xl border border-brand-border/60 bg-brand-bg/40 p-4 transition-all hover:border-brand-border"
                  >
                    <div className="text-center">
                      <span className="font-display text-xs font-bold uppercase tracking-wider text-brand-muted">
                        Table {table.number}
                      </span>
                      <div className="mt-0.5 text-[10px] text-brand-muted/70">
                        {table.capacity} Seats · {table.shape}
                      </div>
                    </div>

                    <div className="my-4 flex h-36 w-36 items-center justify-center rounded-lg bg-white p-2">
                      {hasQR ? (
                        <img
                          src={qrDataUrls[table.id]}
                          className="h-full w-full object-contain"
                          alt={`Table ${table.number} QR`}
                        />
                      ) : (
                        <div className="text-xs text-slate-400">Generating...</div>
                      )}
                    </div>

                    <div className="flex w-full gap-1.5">
                      <button
                        onClick={() => handlePrintSingle(table)}
                        disabled={!hasQR}
                        className="flex-1 rounded-lg bg-brand-surface2 py-1.5 text-xxs font-medium text-brand-foreground transition-colors hover:bg-white/10 disabled:opacity-50"
                      >
                        🖨️ Print
                      </button>
                      <button
                        onClick={() => handleDownload(table)}
                        disabled={!hasQR}
                        className="flex-1 rounded-lg bg-brand-surface2 py-1.5 text-xxs font-medium text-brand-foreground transition-colors hover:bg-white/10 disabled:opacity-50"
                      >
                        💾 Download
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Print-only container */}
      <div id="cf-print-area" className="hidden">
        {printTables.map((table) => {
          const origin = typeof window !== "undefined" ? window.location.origin : "";
          const activeBranchId = table.branchId || tables[0]?.branchId || me.data?.branchId || "";
          const qrUrl = `${origin}/qr/${activeBranchId}?table=${table.number}`;
          return (
            <div
              key={table.id}
              className="page-break flex flex-col items-center justify-center p-8 text-center bg-white text-black"
              style={{ minHeight: "100vh", pageBreakAfter: "always" }}
            >
              <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: "#000000" }}>
                CafeFlow
              </h1>
              <p className="text-sm font-medium text-gray-500 mt-1 uppercase tracking-wide">
                Scan to Order &amp; Pay
              </p>
              
              <div className="my-8 border-2 border-black p-3 bg-white">
                {qrDataUrls[table.id] && (
                  <img
                    src={qrDataUrls[table.id]}
                    style={{ width: "240px", height: "240px" }}
                    alt={`Table ${table.number} QR`}
                  />
                )}
              </div>

              <h2 className="text-5xl font-black tracking-tight" style={{ color: "#000000" }}>
                TABLE {table.number}
              </h2>
              
              <p className="text-[10px] text-gray-400 mt-6 font-mono break-all max-w-xs">
                {qrUrl}
              </p>

              <div className="mt-8 border-t border-dashed border-gray-300 pt-4 w-64 text-center">
                <p className="text-[11px] font-bold text-gray-700">
                  Please scan the QR code using your smartphone to browse our menu, customize items, and place your order directly.
                </p>
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
