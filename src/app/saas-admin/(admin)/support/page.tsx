"use client";
import { Suspense } from "react";
import { SupportCenter } from "@/components/SupportCenter";
import { Spinner } from "@/components/ui";

/** Cross-tenant inbox: every cafe's requests, each tagged with its cafe name. */
export default function SaasSupportPage() {
  // SupportCenter reads ?thread= for deep links, so it needs a Suspense boundary.
  return (
    <Suspense fallback={<div className="flex justify-center py-16"><Spinner /></div>}>
      <SupportCenter side="platform" />
    </Suspense>
  );
}
