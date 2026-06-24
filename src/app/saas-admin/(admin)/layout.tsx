import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/server";
import { AppShell } from "@/components/AppShell";

export default async function SaasLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || session.role !== "saas_owner") redirect("/saas-admin/login");
  return (
    <AppShell
      title="SaaS Admin"
      nav={[
        { href: "/saas-admin/dashboard", label: "Dashboard" },
        { href: "/saas-admin/tenants", label: "Tenants" },
        { href: "/saas-admin/billing/approvals", label: "Approvals" },
        { href: "/saas-admin/config", label: "Config" },
        { href: "/saas-admin/audit-log", label: "Audit Log" },
      ]}
    >
      {children}
    </AppShell>
  );
}
