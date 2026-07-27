"use client";
import { SupportCenter } from "@/components/SupportCenter";

/** Cafe owner's own support requests. RBAC for /owner is cafe_owner only. */
export default function OwnerSupportPage() {
  return <SupportCenter side="cafe" />;
}
