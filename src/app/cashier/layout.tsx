import { guardTenant } from "@/lib/auth/guard";
import { AppShell } from "@/components/AppShell";
import { SubscriptionBanner } from "@/components/SubscriptionBanner";

export default async function CashierLayout({ children }: { children: React.ReactNode }) {
  const { status } = await guardTenant();
  return (
    <AppShell
      title="Cashier POS"
      banner={<SubscriptionBanner status={status} />}
      nav={[
        { href: "/cashier", label: "POS" },
        { href: "/cashier/shift", label: "Shift Totals" },
        { href: "/cashier/profile", label: "Profile" },
      ]}
    >
      {children}
    </AppShell>
  );
}
