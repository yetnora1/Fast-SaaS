"use client";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader, Skeleton } from "@/components/ui";
import { useLang } from "@/lib/i18n";
import { OrderComposer } from "../../OrderComposer";

export default function NewOrderPage() {
  return (
    <Suspense fallback={<Skeleton className="h-8 w-48" />}>
      <NewOrder />
    </Suspense>
  );
}

function NewOrder() {
  const router = useRouter();
  const params = useSearchParams();
  const { t } = useLang();
  const tableId = params.get("table") ?? undefined;
  const tableN = params.get("n");

  return (
    <div className="space-y-4">
      <PageHeader title={`${t("newOrder")}${tableN ? ` · ${t("table")} ${tableN}` : ""}`} />
      <OrderComposer tableId={tableId} onSent={() => router.push("/waiter/orders")} />
    </div>
  );
}
