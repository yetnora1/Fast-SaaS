"use client";
import React from "react";
import { usePoll } from "@/components/fetcher";
import { TablesManagement } from "@/components/TablesManagement";
import { Skeleton } from "@/components/ui";
import { useLang } from "@/lib/i18n";

export default function ManagerTablesPage() {
  const { t } = useLang();
  const { data, loading } = usePoll<{ branch: { id: string; name: string } }>(
    "/api/manager/branch",
    0
  );

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48 rounded-xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <TablesManagement 
        branchId={data.branch.id} 
        branchName={data.branch.name} 
      />
    </div>
  );
}
