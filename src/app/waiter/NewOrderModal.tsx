"use client";
import { useEffect } from "react";
import { useLang } from "@/lib/i18n";
import { OrderComposer } from "./OrderComposer";

export interface OrderTable { id: string; number: number }

/** Wide overlay that hosts the order composer for a tapped table — keeps the
 *  waiter on the floor plan instead of navigating to a separate page. */
export function NewOrderModal({ table, onClose, onSent }: { table: OrderTable | null; onClose: () => void; onSent?: () => void }) {
  const { t } = useLang();

  useEffect(() => {
    if (!table) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [table, onClose]);

  if (!table) return null;

  return (
    <div
      className="animate-fade fixed inset-0 z-modal flex items-start justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-md sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${t("newOrder")} · ${t("table")} ${table.number}`}
    >
      <div
        className="animate-in my-auto w-full max-w-3xl rounded-2xl border border-brand-border bg-brand-surface p-4 shadow-pop"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">
            {t("newOrder")} · {t("table")} {table.number}
          </h2>
          <button onClick={onClose} className="rounded-lg px-2 py-1 text-brand-muted transition-colors hover:bg-white/10 hover:text-white" aria-label="Close">
            ✕
          </button>
        </div>
        <OrderComposer tableId={table.id} onSent={() => (onSent ? onSent() : onClose())} />
      </div>
    </div>
  );
}
