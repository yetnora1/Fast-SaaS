import { guardTenant } from "@/lib/auth/guard";
import { AppShell } from "@/components/AppShell";
import { SubscriptionBanner } from "@/components/SubscriptionBanner";

export default async function ManagerLayout({ children }: { children: React.ReactNode }) {
  const { status } = await guardTenant();
  return (
    <AppShell
      title="Cafe Manager"
      banner={<SubscriptionBanner status={status} />}
      nav={[
        { href: "/manager/dashboard", label: "Dashboard" },
        { href: "/manager/orders", label: "Live Orders" },
        { href: "/manager/tables", label: "Tables & QR" },
        { href: "/manager/menu", label: "Menu" },
        { href: "/manager/shift", label: "Shift" },
        { href: "/manager/inventory", label: "Inventory" },
        { href: "/manager/schedule", label: "Schedule" },
        { href: "/manager/profile", label: "Profile" },
      ]}
    >
      {children}
    </AppShell>
  );
}
