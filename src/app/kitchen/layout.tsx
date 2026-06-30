import { guardTenant } from "@/lib/auth/guard";
import { AppShell } from "@/components/AppShell";
import { SubscriptionBanner } from "@/components/SubscriptionBanner";

export default async function KitchenLayout({ children }: { children: React.ReactNode }) {
  const { status } = await guardTenant();
  return (
    <AppShell
      title="Kitchen KDS"
      banner={<SubscriptionBanner status={status} />}
      nav={[
        { href: "/kitchen/kds", label: "Food KDS" },
        { href: "/kitchen/profile", label: "Profile" },
      ]}
    >
      {children}
    </AppShell>
  );
}
