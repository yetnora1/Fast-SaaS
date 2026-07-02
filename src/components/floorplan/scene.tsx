"use client";
import { useCallback, useMemo, useRef } from "react";
import type { FloorTable, TableShape } from "./types";

/**
 * 2D SVG floor plan. Replaces the previous three.js scene — same props, no 3D
 * dependencies, fast on low-end tablets. DB layout coords are ≈0..450 x 0..220.
 */

const VIEW_W = 480;
const VIEW_H = 260;
const PAD = 15; // data coords start near 0; shift everything inward a little

const STATUS_COLOR: Record<string, string> = {
  available: "#22C55E",
  occupied: "#F59E0B",
  attention: "#EF4444",
  dirty: "#64748B",
};
const SEAT = "#475569";

/* Seat positions in data units, local to the table centre. */
function seatPositions(shape: TableShape, capacity: number): { x: number; y: number }[] {
  const n = Math.max(0, capacity);
  if (n === 0 || shape === "booth") return [];
  if (shape === "rectangle") {
    const perSide = Math.ceil(n / 2);
    const seats: { x: number; y: number }[] = [];
    for (let s = 0; s < n; s++) {
      const side = s < perSide ? 1 : -1;
      const idx = side === 1 ? s : s - perSide;
      const count = side === 1 ? perSide : n - perSide;
      const span = 64;
      const x = count === 1 ? 0 : -span / 2 + (idx * span) / (count - 1);
      seats.push({ x, y: 36 * side });
    }
    return seats;
  }
  const r = shape === "square" ? 42 : 40;
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 + Math.PI / 4;
    return { x: Math.cos(a) * r, y: Math.sin(a) * r };
  });
}

function TableShapeSvg({ shape, color, selected }: { shape: TableShape; color: string; selected: boolean }) {
  const stroke = selected ? "#22C55E" : "rgba(255,255,255,0.18)";
  const sw = selected ? 2.5 : 1;
  if (shape === "round") return <circle r={26} fill={color} stroke={stroke} strokeWidth={sw} />;
  if (shape === "square") return <rect x={-26} y={-26} width={52} height={52} rx={8} fill={color} stroke={stroke} strokeWidth={sw} />;
  if (shape === "rectangle") return <rect x={-42} y={-22} width={84} height={44} rx={8} fill={color} stroke={stroke} strokeWidth={sw} />;
  // booth: table + two benches
  return (
    <g>
      <rect x={-34} y={-34} width={68} height={12} rx={4} fill={SEAT} />
      <rect x={-34} y={22} width={68} height={12} rx={4} fill={SEAT} />
      <rect x={-30} y={-16} width={60} height={32} rx={6} fill={color} stroke={stroke} strokeWidth={sw} />
    </g>
  );
}

export function FloorScene({
  tables,
  selectedId,
  editMode,
  dragging,
  hideLabels = false,
  onSelect,
  onDragStart,
  onDragMove,
  onDragEnd,
  onClearSelect,
}: {
  tables: FloorTable[];
  selectedId: string | null;
  editMode: boolean;
  dragging: boolean;
  hideLabels?: boolean;
  onSelect: (id: string) => void;
  onDragStart: () => void;
  onDragMove: (x: number, y: number) => void;
  onDragEnd: () => void;
  onClearSelect: () => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);

  /* Convert a pointer event to data-space coords via the SVG's CTM. */
  const toData = useCallback((e: React.PointerEvent): [number, number] => {
    const svg = svgRef.current;
    if (!svg) return [0, 0];
    const pt = new DOMPoint(e.clientX, e.clientY);
    const ctm = svg.getScreenCTM();
    if (!ctm) return [0, 0];
    const p = pt.matrixTransform(ctm.inverse());
    return [p.x - PAD, p.y - PAD];
  }, []);

  const handleMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return;
      const [x, y] = toData(e);
      onDragMove(Math.max(0, Math.min(450, x)), Math.max(0, Math.min(220, y)));
    },
    [dragging, toData, onDragMove],
  );

  const sorted = useMemo(() => [...tables].sort((a, b) => a.yPos - b.yPos), [tables]);

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      className="h-full w-full select-none"
      style={{ background: "#020617", touchAction: "none" }}
      onPointerMove={handleMove}
      onPointerUp={() => dragging && onDragEnd()}
      onPointerLeave={() => dragging && onDragEnd()}
    >
      <defs>
        <pattern id="fp-grid" width={24} height={24} patternUnits="userSpaceOnUse">
          <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#1e293b" strokeWidth={0.6} />
        </pattern>
      </defs>
      <rect width={VIEW_W} height={VIEW_H} fill="url(#fp-grid)" onPointerDown={() => onClearSelect()} />

      {sorted.map((t) => {
        const color = STATUS_COLOR[t.status] ?? STATUS_COLOR.available;
        const seats = seatPositions(t.shape, t.capacity);
        const orders = t.orders?.length ?? 0;
        const selected = selectedId === t.id;
        return (
          <g
            key={t.id}
            transform={`translate(${t.xPos + PAD}, ${t.yPos + PAD})`}
            style={{ cursor: editMode ? "grab" : "pointer" }}
            onPointerDown={(e) => {
              if (!editMode) return;
              e.stopPropagation();
              onSelect(t.id);
              onDragStart();
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (!editMode) onSelect(t.id);
            }}
          >
            <g transform={`rotate(${t.rotation ?? 0})`}>
              {seats.map((s, i) => (
                <circle key={i} cx={s.x} cy={s.y} r={7} fill={SEAT} stroke="rgba(255,255,255,0.1)" strokeWidth={0.5} />
              ))}
              {selected && <circle r={54} fill="none" stroke="#22C55E" strokeWidth={1.5} strokeDasharray="5 4" opacity={0.9} />}
              <TableShapeSvg shape={t.shape} color={color} selected={selected} />
            </g>
            {!hideLabels && (
              <g pointerEvents="none">
                <text textAnchor="middle" y={-1} fill="#020617" fontSize={13} fontWeight={800} fontFamily="inherit">
                  T{t.number}
                </text>
                <text textAnchor="middle" y={12} fill="#020617" fontSize={8.5} fontWeight={600} opacity={0.75}>
                  {t.capacity} seats{orders > 0 ? ` · ${orders} 🧾` : ""}
                </text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}
