import { guardTenant } from "@/lib/auth/guard";
import { AppShell } from "@/components/AppShell";
import { SubscriptionBanner } from "@/components/SubscriptionBanner";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const { status } = await guardTenant();
  return (
    <AppShell
      title="Store Manager"
      banner={<SubscriptionBanner status={status} />}
      nav={[
        { href: "/store/dashboard", label: "Inventory" },
        { href: "/store/suppliers", label: "Suppliers" },
        { href: "/store/orders", label: "Purchase Orders" },
        { href: "/store/reports", label: "Reports" },
      ]}
    >
      {children}
    </AppShell>
  );
}
