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
        { href: "/manager/menu", label: "Menu" },
        // { href: "/manager/shift", label: "Shift" },
        { href: "/manager/inventory", label: "Inventory" },
        // { href: "/manager/schedule", label: "Schedule" },
        { href: "/manager/attendance", label: "Attendance" },
        { href: "/manager/payroll", label: "Payroll" },
        { href: "/manager/purchases", label: "Purchases" },
        { href: "/manager/equipment", label: "Equipment" },
        { href: "/manager/qr-codes", label: "QR Codes" },
      ]}
    >
      {children}
    </AppShell>
  );
}
