"use client";
import dynamic from "next/dynamic";
import type { FloorPlanProps } from "./FloorPlan";

// The floor plan uses window/print APIs — load client-only.
const Inner = dynamic(() => import("./FloorPlan"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center rounded-2xl border border-brand-border/70 bg-brand-bg" style={{ height: 480 }}>
      <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-brand-accent" />
    </div>
  ),
});

export function FloorPlan(props: FloorPlanProps) {
  return <Inner {...props} />;
}

export type { FloorPlanProps } from "./FloorPlan";
export type { FloorTable } from "./types";
