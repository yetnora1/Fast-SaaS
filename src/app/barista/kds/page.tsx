"use client";
import { KdsBoard } from "@/components/KdsBoard";
import { PageHeader, LiveDot } from "@/components/ui";
import { useLang } from "@/lib/i18n";

export default function BaristaKds() {
  const { t } = useLang();
  return (
    <div className="space-y-5">
      <PageHeader title={t("drinksQueue")}>
        <LiveDot label={t("live")} />
      </PageHeader>
      <KdsBoard endpoint="/api/kds/drinks" station="BARISTA" />
    </div>
  );
}
