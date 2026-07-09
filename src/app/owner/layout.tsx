import { guardTenant } from "@/lib/auth/guard";
import { AppShell } from "@/components/AppShell";
import { SubscriptionBanner } from "@/components/SubscriptionBanner";

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const { status } = await guardTenant();
  return (
    <AppShell
      title="Cafe Owner"
      banner={<SubscriptionBanner status={status} />}
      nav={[
        { href: "/owner/dashboard", label: "Dashboard" },
        { href: "/owner/menu", label: "Menu" },
        { href: "/owner/staff", label: "Staff" },
        { href: "/owner/attendance", label: "Attendance" },
        { href: "/owner/branches", label: "Branches" },
        { href: "/owner/payments", label: "Payments" },
        { href: "/owner/reports", label: "Reports" },
        { href: "/owner/payroll", label: "Payroll" },
        { href: "/owner/purchases", label: "Purchases" },
        { href: "/owner/equipment", label: "Equipment" },
      ]}
    >
      {children}
    </AppShell>
  );
}
