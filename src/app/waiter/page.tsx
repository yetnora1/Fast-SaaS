"use client";
import { useState } from "react";
import { PageHeader } from "@/components/ui";
import { TableGrid } from "@/components/TableQR";
import { useLang } from "@/lib/i18n";
import { NewOrderModal, type OrderTable } from "./NewOrderModal";

export default function WaiterTables() {
  const { t } = useLang();
  const [active, setActive] = useState<OrderTable | null>(null);
  return (
    <div className="space-y-5">
      <PageHeader title={t("myTables")} subtitle={t("tapTableHint")} />
      <TableGrid onTableSelect={(tbl) => setActive({ id: tbl.id, number: tbl.number })} />
      <NewOrderModal table={active} onClose={() => setActive(null)} />
    </div>
  );
}
