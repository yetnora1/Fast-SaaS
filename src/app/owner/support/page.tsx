"use client";
import { Suspense } from "react";
import { SupportCenter } from "@/components/SupportCenter";
import { Spinner } from "@/components/ui";

/** Cafe owner's own support requests. RBAC for /owner is cafe_owner only. */
export default function OwnerSupportPage() {
  // SupportCenter reads ?thread= for deep links, so it needs a Suspense boundary.
  return (
    <Suspense fallback={<div className="flex justify-center py-16"><Spinner /></div>}>
      <SupportCenter side="cafe" />
    </Suspense>
  );
}
