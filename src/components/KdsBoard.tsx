"use client";
import { api, usePoll } from "@/components/fetcher";
import { Button, Card, EmptyState, TimerBadge } from "@/components/ui";
import { AlertTriangleIcon, NoteIcon, PauseIcon, CheckCircleIcon, InboxIcon } from "@/components/icons";
import { useLang } from "@/lib/i18n";

interface OItem { id: string; menuItem: { name: string; nameAm?: string | null }; quantity: number; status: string; notes: string | null; allergyNote: string | null; modifiersJson: any }
interface Order { id: string; status: string; submittedAt: string | null; allergyAck: boolean; heldForBar: boolean; table: { number: number } | null; items: OItem[] }

const LANES = ["New", "Preparing", "Ready"] as const;
const LANE_KEY = { New: "laneNew", Preparing: "lanePreparing", Ready: "laneReady" } as const;

function laneFor(o: Order): (typeof LANES)[number] {
  if (o.status === "READY") return "Ready";
  if (o.items.some((i) => ["PREPARING", "PLATING", "ACCEPTED"].includes(i.status))) return "Preparing";
  return "New";
}

export function KdsBoard({ endpoint, station }: { endpoint: string; station: "BARISTA" | "KITCHEN" }) {
  const { t, tr, statusLabel } = useLang();
  const { data, reload } = usePoll<{ orders: Order[] }>(endpoint, 3000);

  async function itemAction(id: string, action: string) {
    await api(`/api/kds/items/${id}/${action}`, { method: "PATCH" });
    reload();
  }
  async function orderAction(id: string, action: string) {
    await api(`/api/kds/orders/${id}/${action}`, { method: "PATCH" });
    reload();
  }

  return (
    <div className="grid md:grid-cols-3 gap-3">
      {LANES.map((lane) => {
        const laneOrders = data?.orders.filter((o) => laneFor(o) === lane) ?? [];
        return (
        <div key={lane} className="space-y-3">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold">
            {t(LANE_KEY[lane])}
            <span className="tabular rounded-full bg-white/10 px-2 py-0.5 text-xs font-medium text-brand-muted">{laneOrders.length}</span>
          </h2>
          {data && laneOrders.length === 0 && <EmptyState icon={<InboxIcon className="h-7 w-7" />}>{t("noOrders")}</EmptyState>}
          {laneOrders
            .map((o) => {
              const allergy = o.items.find((i) => i.allergyNote);
              return (
                <Card key={o.id} className="space-y-2 text-base">
                  <div className="flex justify-between items-center">
                    <span className="font-display text-xl font-bold">{t("table")} {o.table?.number ?? "—"}</span>
                    {o.submittedAt && <TimerBadge since={o.submittedAt} />}
                  </div>

                  {allergy && !o.allergyAck && (
                    <div className="animate-fade rounded-lg bg-status-redSolid p-2 text-sm font-bold text-white">
                      <span className="flex items-center gap-1.5">
                        <AlertTriangleIcon className="h-4 w-4" /> {t("allergy")}: {o.items.filter((i) => i.allergyNote).map((i) => i.allergyNote).join("; ")}
                      </span>
                      <Button variant="ghost" className="mt-1 w-full" onClick={() => orderAction(o.id, "ack-allergy")}>{t("acknowledge")}</Button>
                    </div>
                  )}

                  <ul className="space-y-1">
                    {o.items.map((it) => (
                      <li key={it.id} className="flex justify-between items-center border-t border-brand-border/60 pt-1">
                        <span>
                          {it.quantity}× {tr(it.menuItem.name, it.menuItem.nameAm)}
                          {it.notes && <span className="flex items-center gap-1 text-xs text-status-yellowText"><NoteIcon className="h-3.5 w-3.5" /> {it.notes}</span>}
                        </span>
                        <span className="flex gap-1">
                          {it.status === "NEW" && (
                            <>
                              <Button variant="ghost" onClick={() => itemAction(it.id, "accept")}>{t("accept")}</Button>
                              <Button variant="danger" onClick={() => itemAction(it.id, "reject")}>{t("reject")}</Button>
                            </>
                          )}
                          {it.status === "ACCEPTED" && (
                            <Button variant="ghost" onClick={() => itemAction(it.id, "start")}>{t("start")}</Button>
                          )}
                          {it.status === "REJECTED" && <span className="text-xs font-bold text-status-redText">{statusLabel("REJECTED")}</span>}
                          {station === "KITCHEN" && it.status === "PREPARING" && (
                            <Button variant="ghost" onClick={() => itemAction(it.id, "plate")}>{t("plate")}</Button>
                          )}
                          {["PREPARING", "PLATING"].includes(it.status) && (
                            <Button variant="ghost" onClick={() => itemAction(it.id, "ready")}>{t("ready")}</Button>
                          )}
                          {it.status === "READY" && <CheckCircleIcon className="h-5 w-5 text-status-greenText" />}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {o.heldForBar && <div className="flex items-center gap-1.5 text-sm text-status-yellowText"><PauseIcon className="h-4 w-4" /> {t("holdForBar")}</div>}

                  <div className="flex gap-2">
                    {station === "KITCHEN" && <Button variant="ghost" className="flex-1" onClick={() => orderAction(o.id, "accept")}>{t("accept")}</Button>}
                    <Button className="flex-1" onClick={() => orderAction(o.id, "ready")}>{t("orderReady")}</Button>
                  </div>
                </Card>
              );
            })}
        </div>
        );
      })}
    </div>
  );
}
