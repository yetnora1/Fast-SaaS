import { guardTenant } from "@/lib/auth/guard";
import { AppShell } from "@/components/AppShell";
import { SubscriptionBanner } from "@/components/SubscriptionBanner";

export default async function BaristaLayout({ children }: { children: React.ReactNode }) {
  const { status } = await guardTenant();
  return (
    <AppShell
      title="Barista KDS"
      banner={<SubscriptionBanner status={status} />}
      nav={[
        { href: "/barista/kds", label: "Drinks KDS" },
        { href: "/barista/profile", label: "Profile" },
      ]}
    >
      {children}
    </AppShell>
  );
}
