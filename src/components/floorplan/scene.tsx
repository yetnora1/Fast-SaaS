"use client";
import { useMemo, useRef } from "react";
import { Canvas, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls, RoundedBox, Html, Grid, ContactShadows } from "@react-three/drei";
import type { FloorTable, TableShape } from "./types";

/* ── Mapping between DB layout coords (≈0..450, from seed) and 3D world ── */
const SCALE = 55;
const CX = 230;
const CY = 110;
export const toWorld = (x: number, y: number): [number, number] => [(x - CX) / SCALE, (y - CY) / SCALE];
export const toData = (wx: number, wz: number): [number, number] => [wx * SCALE + CX, wz * SCALE + CY];

const STATUS_COLOR: Record<string, string> = {
  available: "#22C55E",
  occupied: "#F59E0B",
  attention: "#EF4444",
  dirty: "#64748B",
};
const LEG = "#0b1220";
const CHAIR = "#475569";

/* Seat ring/row positions (local to the table), each facing inward. */
function seatPositions(shape: TableShape, capacity: number): { x: number; z: number; rot: number }[] {
  const n = Math.max(0, capacity);
  if (n === 0) return [];
  if (shape === "rectangle") {
    const perSide = Math.ceil(n / 2);
    const seats: { x: number; z: number; rot: number }[] = [];
    for (let s = 0; s < n; s++) {
      const side = s < perSide ? 1 : -1;
      const idx = side === 1 ? s : s - perSide;
      const count = side === 1 ? perSide : n - perSide;
      const span = 1.3;
      const x = count === 1 ? 0 : -span / 2 + (idx * span) / (count - 1);
      const z = 0.82 * side;
      seats.push({ x, z, rot: Math.atan2(-x, -z) });
    }
    return seats;
  }
  // round / square → even ring
  const r = shape === "square" ? 0.92 : 0.95;
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 + Math.PI / 4;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    return { x, z, rot: Math.atan2(-x, -z) };
  });
}

function Chair({ x, z, rot }: { x: number; z: number; rot: number }) {
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      <RoundedBox args={[0.34, 0.07, 0.34]} radius={0.025} position={[0, 0.42, 0]} castShadow>
        <meshStandardMaterial color={CHAIR} roughness={0.7} />
      </RoundedBox>
      <RoundedBox args={[0.34, 0.32, 0.06]} radius={0.025} position={[0, 0.6, 0.15]} castShadow>
        <meshStandardMaterial color={CHAIR} roughness={0.7} />
      </RoundedBox>
    </group>
  );
}

function TableMesh({ shape, color }: { shape: TableShape; color: string }) {
  const top = <meshStandardMaterial color={color} roughness={0.35} metalness={0.1} />;
  const legMat = <meshStandardMaterial color={LEG} roughness={0.6} />;
  if (shape === "round") {
    return (
      <group>
        <mesh position={[0, 0.72, 0]} castShadow>
          <cylinderGeometry args={[0.62, 0.62, 0.08, 40]} />
          {top}
        </mesh>
        <mesh position={[0, 0.36, 0]}>
          <cylinderGeometry args={[0.08, 0.12, 0.72, 16]} />
          {legMat}
        </mesh>
        <mesh position={[0, 0.02, 0]}>
          <cylinderGeometry args={[0.3, 0.3, 0.04, 24]} />
          {legMat}
        </mesh>
      </group>
    );
  }
  if (shape === "booth") {
    return (
      <group>
        <RoundedBox args={[1.2, 0.08, 0.62]} radius={0.03} position={[0, 0.72, 0]} castShadow>
          {top}
        </RoundedBox>
        <mesh position={[0, 0.36, 0]}>
          <boxGeometry args={[0.12, 0.72, 0.12]} />
          {legMat}
        </mesh>
        {[1, -1].map((s) => (
          <group key={s}>
            <RoundedBox args={[1.5, 0.34, 0.4]} radius={0.05} position={[0, 0.2, 0.64 * s]} castShadow>
              <meshStandardMaterial color={CHAIR} roughness={0.75} />
            </RoundedBox>
            <RoundedBox args={[1.5, 0.5, 0.12]} radius={0.05} position={[0, 0.5, 0.86 * s]} castShadow>
              <meshStandardMaterial color={CHAIR} roughness={0.75} />
            </RoundedBox>
          </group>
        ))}
      </group>
    );
  }
  // square or rectangle
  const w = shape === "rectangle" ? 1.7 : 1.0;
  const d = shape === "rectangle" ? 0.9 : 1.0;
  return (
    <group>
      <RoundedBox args={[w, 0.08, d]} radius={0.03} position={[0, 0.72, 0]} castShadow>
        {top}
      </RoundedBox>
      {[
        [w / 2 - 0.12, d / 2 - 0.12],
        [-(w / 2 - 0.12), d / 2 - 0.12],
        [w / 2 - 0.12, -(d / 2 - 0.12)],
        [-(w / 2 - 0.12), -(d / 2 - 0.12)],
      ].map(([lx, lz], i) => (
        <mesh key={i} position={[lx, 0.36, lz]}>
          <boxGeometry args={[0.08, 0.72, 0.08]} />
          {legMat}
        </mesh>
      ))}
    </group>
  );
}

function Table3D({
  table,
  selected,
  editMode,
  hideLabels,
  onSelect,
  onDragStart,
}: {
  table: FloorTable;
  selected: boolean;
  editMode: boolean;
  hideLabels: boolean;
  onSelect: () => void;
  onDragStart: () => void;
}) {
  const [wx, wz] = toWorld(table.xPos, table.yPos);
  const color = STATUS_COLOR[table.status] ?? STATUS_COLOR.available;
  const seats = useMemo(() => seatPositions(table.shape, table.capacity), [table.shape, table.capacity]);
  const orders = table.orders?.length ?? 0;

  return (
    <group
      position={[wx, 0, wz]}
      rotation={[0, ((table.rotation ?? 0) * Math.PI) / 180, 0]}
      onPointerDown={(e: ThreeEvent<PointerEvent>) => {
        if (!editMode) return;
        e.stopPropagation();
        onSelect();
        onDragStart();
      }}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        if (!editMode) onSelect();
      }}
      onPointerOver={() => (document.body.style.cursor = editMode ? "grab" : "pointer")}
      onPointerOut={() => (document.body.style.cursor = "auto")}
    >
      <TableMesh shape={table.shape} color={color} />
      {table.shape !== "booth" && seats.map((s, i) => <Chair key={i} {...s} />)}

      {selected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
          <ringGeometry args={[1.15, 1.32, 48]} />
          <meshBasicMaterial color="#22C55E" transparent opacity={0.9} />
        </mesh>
      )}

      {!hideLabels && (
        <Html position={[0, 1.15, 0]} center distanceFactor={9} zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
          <div
            style={{ pointerEvents: "none" }}
            className="flex flex-col items-center gap-0.5 whitespace-nowrap rounded-lg bg-black/70 px-2 py-1 text-center font-sans text-white shadow-lg backdrop-blur-sm"
          >
            <span className="text-sm font-bold leading-none">T{table.number}</span>
            <span className="text-[10px] leading-none opacity-80">
              {table.capacity}🪑{orders > 0 ? ` · ${orders}🧾` : ""}
            </span>
          </div>
        </Html>
      )}
    </group>
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
  const floorRef = useRef(null);

  return (
    <Canvas shadows camera={{ position: [0, 8.5, 10], fov: 42 }} dpr={[1, 2]}>
      <color attach="background" args={["#020617"]} />
      <fog attach="fog" args={["#020617", 14, 30]} />
      <ambientLight intensity={0.55} />
      <hemisphereLight args={["#cbd5e1", "#0b1220", 0.6]} />
      <directionalLight
        position={[6, 12, 6]}
        intensity={1.1}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
      />

      {/* Drag surface + room floor */}
      <mesh
        ref={floorRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        receiveShadow
        onPointerDown={() => onClearSelect()}
        onPointerMove={(e: ThreeEvent<PointerEvent>) => {
          if (!dragging) return;
          const [x, y] = toData(e.point.x, e.point.z);
          onDragMove(x, y);
        }}
        onPointerUp={() => dragging && onDragEnd()}
      >
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color="#0b1220" roughness={0.95} />
      </mesh>

      <Grid
        position={[0, 0.01, 0]}
        args={[40, 40]}
        cellSize={1}
        cellThickness={0.6}
        cellColor="#1e293b"
        sectionSize={4}
        sectionThickness={1}
        sectionColor="#22304a"
        fadeDistance={26}
        fadeStrength={1}
        infiniteGrid
      />

      <ContactShadows position={[0, 0.02, 0]} opacity={0.5} scale={30} blur={2.2} far={6} />

      {tables.map((t) => (
        <Table3D
          key={t.id}
          table={t}
          selected={selectedId === t.id}
          editMode={editMode}
          hideLabels={hideLabels}
          onSelect={() => onSelect(t.id)}
          onDragStart={onDragStart}
        />
      ))}

      <OrbitControls
        makeDefault
        enabled={!dragging}
        enablePan
        minDistance={4}
        maxDistance={22}
        maxPolarAngle={Math.PI / 2.15}
        target={[0, 0, 0]}
      />
    </Canvas>
  );
}
