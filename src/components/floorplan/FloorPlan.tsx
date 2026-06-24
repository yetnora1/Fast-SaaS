"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, usePoll } from "@/components/fetcher";
import { useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { FloorScene } from "./scene";
import type { FloorTable, TableShape, TableStatus } from "./types";

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
  const me = usePoll<{ role: string } | null>("/api/auth/me", 0);
  const canEdit = allowEdit && !!me.data && EDIT_ROLES.includes(me.data.role);

  useEffect(() => {
    if (poll.data && !editMode) setTables(poll.data.tables);
  }, [poll.data, editMode]);

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
    </div>
  );
}
