"use client";
import { KdsBoard } from "@/components/KdsBoard";
import { PageHeader, LiveDot } from "@/components/ui";
import { FeedbackCard } from "@/components/FeedbackCard";
import { useLang } from "@/lib/i18n";

export default function KitchenKds() {
  const { t } = useLang();
  return (
    <div className="space-y-5">
      <PageHeader title={t("kitchenQueue")}>
        <LiveDot label={t("live")} />
      </PageHeader>
      <KdsBoard endpoint="/api/kds/food" station="KITCHEN" />
      <FeedbackCard station="KITCHEN" />
    </div>
  );
}
