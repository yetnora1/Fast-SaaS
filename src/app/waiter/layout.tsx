import { guardTenant } from "@/lib/auth/guard";
import { AppShell } from "@/components/AppShell";
import { SubscriptionBanner } from "@/components/SubscriptionBanner";

export default async function WaiterLayout({ children }: { children: React.ReactNode }) {
  const { status } = await guardTenant();
  return (
    <AppShell
      title="Waiter"
      banner={<SubscriptionBanner status={status} />}
      nav={[
        { href: "/waiter", label: "Tables" },
        { href: "/waiter/orders", label: "My Orders" },
        { href: "/waiter/qr-orders", label: "QR Orders" },
        { href: "/waiter/profile", label: "Profile" },
      ]}
    >
      {children}
    </AppShell>
  );
}
