"use client";
import { Suspense, useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { api, usePoll } from "@/components/fetcher";
import { Button, Card, Spinner } from "@/components/ui";
import { GlobeIcon, CheckCircleIcon, ClockIcon, AlertTriangleIcon } from "@/components/icons";
import { useLang } from "@/lib/i18n";

interface Item { id: string; name: string; nameAm: string | null; price: string; imageUrl?: string | null }
interface Category { id: string; name: string; nameAm: string | null; items: Item[] }

export default function QrOrderPage() {
  return (
    <Suspense fallback={<main className="flex min-h-dvh items-center justify-center"><Spinner /></main>}>
      <QrOrder />
    </Suspense>
  );
}

function QrOrder() {
  const { branchId } = useParams<{ branchId: string }>();
  const tableNumber = useSearchParams().get("table");
  const { lang, toggle, t, tr } = useLang();
  const { data } = usePoll<{ branch: { name: string }; categories: Category[] }>(`/api/qr/${branchId}/menu`, 0);
  const [cart, setCart] = useState<Record<string, { name: string; qty: number }>>({});
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const key = `cafeflow_active_order_${branchId}_${tableNumber ?? "0"}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        setActiveOrderId(saved);
      }
    }
  }, [branchId, tableNumber]);

  const handleClearOrder = () => {
    if (typeof window !== "undefined") {
      const key = `cafeflow_active_order_${branchId}_${tableNumber ?? "0"}`;
      localStorage.removeItem(key);
      setActiveOrderId(null);
    }
  };

  function add(it: Item) {
    setCart((c) => ({ ...c, [it.id]: { name: it.name, qty: (c[it.id]?.qty ?? 0) + 1 } }));
  }

  async function placeOrder() {
    const items = Object.entries(cart).map(([menuItemId, v]) => ({ menuItemId, quantity: v.qty }));
    if (items.length === 0) return;
    try {
      const res = await api<{ orderId: string; status: string }>(`/api/qr/${branchId}/order`, {
        method: "POST",
        body: JSON.stringify({ tableNumber: tableNumber ? Number(tableNumber) : undefined, items }),
      });
      if (res && res.orderId) {
        if (typeof window !== "undefined") {
          const key = `cafeflow_active_order_${branchId}_${tableNumber ?? "0"}`;
          localStorage.setItem(key, res.orderId);
        }
        setActiveOrderId(res.orderId);
        setCart({});
      }
    } catch (err) {
      console.error("Failed to place QR order:", err);
    }
  }

  if (activeOrderId) {
    return (
      <main className="mx-auto min-h-dvh max-w-6xl space-y-4 p-4 md:p-6 pb-24">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-xl font-bold">{data?.branch.name ?? t("menu")} {tableNumber && `· ${t("table")} ${tableNumber}`}</h1>
          <button onClick={toggle} className="inline-flex items-center gap-1.5 rounded-xl bg-brand-surface2 px-2.5 py-1.5 text-sm transition-colors hover:bg-white/10" title="Language / ቋንቋ">
            <GlobeIcon className="h-4 w-4" />
            {lang === "en" ? "አማ" : "EN"}
          </button>
        </div>
        <OrderTracker
          branchId={branchId}
          tableNumber={tableNumber}
          orderId={activeOrderId}
          onClear={handleClearOrder}
        />
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-dvh max-w-6xl space-y-4 p-4 md:p-6 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-bold">{data?.branch.name ?? t("menu")} {tableNumber && `· ${t("table")} ${tableNumber}`}</h1>
        <button onClick={toggle} className="inline-flex items-center gap-1.5 rounded-xl bg-brand-surface2 px-2.5 py-1.5 text-sm transition-colors hover:bg-white/10" title="Language / ቋንቋ">
          <GlobeIcon className="h-4 w-4" />
          {lang === "en" ? "አማ" : "EN"}
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data?.categories.map((c) => (
          <Card key={c.id} className="flex flex-col justify-between">
            <div>
              <div className="mb-3 font-semibold text-brand-accent text-base border-b border-brand-border/60 pb-2">{tr(c.name, c.nameAm)}</div>
              <div className="space-y-2">
                {c.items.map((it) => (
                  <div key={it.id} className="flex items-center justify-between gap-3 border-t border-brand-border/60 py-2 first:border-t-0">
                    <div className="flex items-center gap-3">
                      {it.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={it.imageUrl} alt={it.name} className="h-12 w-12 rounded-lg object-cover bg-brand-surface2 flex-shrink-0" />
                      )}
                      <div className="flex flex-col">
                        <span className="font-medium text-sm text-white">{tr(it.name, it.nameAm)}</span>
                        <span className="tabular text-xs text-brand-muted">{Number(it.price).toLocaleString()} ETB {cart[it.id] && <b className="tabular text-brand-accent">×{cart[it.id].qty}</b>}</span>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => add(it)}>{t("add")}</Button>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {Object.keys(cart).length > 0 && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:w-96 border border-brand-border bg-brand-surface/95 backdrop-blur px-4 py-3 flex justify-between items-center rounded-2xl shadow-xl z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <span className="font-medium text-sm text-white">
            {Object.values(cart).reduce((sum, item) => sum + item.qty, 0)} {Object.values(cart).reduce((sum, item) => sum + item.qty, 0) === 1 ? "item" : "items"} selected
          </span>
          <Button onClick={placeOrder} size="sm">{t("placeOrder")}</Button>
        </div>
      )}
    </main>
  );
}

function OrderTracker({
  branchId,
  tableNumber,
  orderId,
  onClear,
}: {
  branchId: string;
  tableNumber: string | null;
  orderId: string;
  onClear: () => void;
}) {
  const { lang, t, tr } = useLang();
  const { data: order, error, loading } = usePoll<{
    id: string;
    status: string;
    type: string;
    createdAt: string;
    tableNumber?: number;
    items: {
      id: string;
      name: string;
      nameAm: string | null;
      quantity: number;
      status: string;
      notes?: string;
    }[];
  }>(`/api/qr/${branchId}/order/${orderId}`, 4000);

  if (loading && !order) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <Spinner />
        <span className="text-sm text-brand-muted">
          {lang === "en" ? "Loading order details..." : "የትዕዛዝ ዝርዝር በመጫን ላይ..."}
        </span>
      </div>
    );
  }

  if (error || !order) {
    return (
      <Card className="flex flex-col items-center gap-3 p-6 text-center max-w-md mx-auto my-12 border-status-attention/30 bg-brand-surface">
        <AlertTriangleIcon className="h-12 w-12 text-status-attention" />
        <div className="font-display text-xl font-bold text-white">
          {lang === "en" ? "Failed to load order" : "ትዕዛዝ መጫን አልተቻለም"}
        </div>
        <p className="text-sm text-brand-muted">
          {lang === "en"
            ? "We couldn't retrieve the status of this order. It may have been cleared or cancelled."
            : "የዚህን ትዕዛዝ ሁኔታ ማግኘት አልቻልንም። ምናልባት ተሰርዞ ወይም ተደምስሶ ሊሆን ይችላል።"}
        </p>
        <Button onClick={onClear} className="w-full mt-2">
          {lang === "en" ? "Go Back to Menu" : "ወደ ምናሌ ይመለሱ"}
        </Button>
      </Card>
    );
  }

  let currentStep = 1;
  const status = order.status;

  if (["SUBMITTED", "IN_PREPARATION", "PARTIALLY_READY"].includes(status)) {
    currentStep = 2;
  } else if (status === "READY") {
    currentStep = 3;
  } else if (["DELIVERED", "BILL_REQUESTED", "PAYMENT_PENDING", "COMPLETED"].includes(status)) {
    currentStep = 4;
  } else if (["VOIDED", "REFUNDED"].includes(status)) {
    currentStep = -1; // special cancelled state
  }

  const steps = [
    {
      num: 1,
      titleEn: "Awaiting",
      titleAm: "በመጠባበቅ ላይ",
      descEn: "Confirming order",
      descAm: "ትዕዛዝ ማረጋገጥ",
    },
    {
      num: 2,
      titleEn: "Preparing",
      titleAm: "በዝግጅት ላይ",
      descEn: "In kitchen / bar",
      descAm: "በማብሰያ / ባር ላይ",
    },
    {
      num: 3,
      titleEn: "Ready",
      titleAm: "ዝግጁ",
      descEn: "Ready for pickup",
      descAm: "ለመውሰድ ዝግጁ",
    },
    {
      num: 4,
      titleEn: "Served",
      titleAm: "ቀረበ",
      descEn: "Enjoy your order!",
      descAm: "መልካም ምግብ!",
    },
  ];

  return (
    <div className="space-y-6 max-w-2xl mx-auto my-6 animate-in">
      <Card className="p-6 bg-brand-surface/85 border border-brand-border/60 shadow-pop relative overflow-hidden">
        <div className="absolute -top-12 -right-12 h-36 w-36 rounded-full bg-brand-accent/5 blur-3xl" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-brand-border/60 pb-4 gap-2">
          <div>
            <span className="text-xs uppercase tracking-wider font-semibold text-brand-accent">
              {lang === "en" ? "Self-Order Tracker" : "የራስ-ትዕዛዝ መከታተያ"}
            </span>
            <h2 className="font-display text-xl font-bold text-white mt-0.5">
              {lang === "en" ? "Order Status" : "የትዕዛዝ ሁኔታ"} {tableNumber && `· ${t("table")} ${tableNumber}`}
            </h2>
          </div>
          <div className="text-xs text-brand-muted tabular sm:text-right">
            <div>ID: <span className="font-mono text-white/90">{order.id.slice(-8).toUpperCase()}</span></div>
            <div>{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        </div>

        {currentStep === -1 ? (
          <div className="my-6 p-4 rounded-xl bg-status-attention/10 border border-status-attention/20 flex items-start gap-3 animate-in">
            <AlertTriangleIcon className="h-5 w-5 text-status-attention mt-0.5 shrink-0" />
            <div>
              <h3 className="font-semibold text-status-attention text-sm">
                {lang === "en" ? "Order Cancelled" : "ትዕዛዝ ተሰርዟል"}
              </h3>
              <p className="text-xs text-brand-muted mt-1 leading-relaxed">
                {lang === "en"
                  ? "This order was voided or cancelled. Please request help from staff or create a new order."
                  : "ይህ ትዕዛዝ ተሰርዟል። እባክዎን አስተናጋጅ ይጠይቁ ወይም አዲስ ትዕዛዝ ይፍጠሩ።"}
              </p>
            </div>
          </div>
        ) : (
          <div className="my-8 relative">
            <div className="absolute top-[18px] left-[32px] right-[32px] h-0.5 bg-brand-surface2 z-0 hidden sm:block" />
            <div
              className="absolute top-[18px] left-[32px] h-0.5 bg-brand-accent transition-all duration-500 ease-out z-0 hidden sm:block"
              style={{ width: `${Math.max(0, ((currentStep - 1) / (steps.length - 1)) * 100)}%` }}
            />

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-4 sm:gap-2 relative z-10">
              {steps.map((step) => {
                const isCompleted = currentStep > step.num;
                const isActive = currentStep === step.num;

                return (
                  <div key={step.num} className="flex sm:flex-col items-center gap-4 sm:gap-2.5 text-left sm:text-center group">
                    <div
                      className={`h-9 w-9 rounded-full flex items-center justify-center border-2 text-sm font-semibold transition-all duration-300 shadow-md ${
                        isActive
                          ? "bg-brand-accent/15 border-brand-accent text-brand-accent scale-110 ring-4 ring-brand-accent/20 animate-pulse-soft"
                          : isCompleted
                          ? "bg-brand-accent border-brand-accent text-brand-bg"
                          : "bg-brand-surface border-brand-border text-brand-muted"
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircleIcon className="h-4.5 w-4.5 text-brand-bg stroke-[2.5]" />
                      ) : (
                        <span>{step.num}</span>
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span
                        className={`text-sm font-semibold transition-colors duration-300 ${
                          isActive ? "text-brand-accent" : isCompleted ? "text-white" : "text-brand-muted"
                        }`}
                      >
                        {lang === "en" ? step.titleEn : step.titleAm}
                      </span>
                      <span className="text-xs text-brand-muted leading-tight">
                        {lang === "en" ? step.descEn : step.descAm}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-8 space-y-4">
          <h3 className="font-semibold text-white/95 uppercase tracking-wider text-xs border-b border-brand-border/60 pb-2">
            {lang === "en" ? "Order Items" : "የትዕዛዝ ዕቃዎች"}
          </h3>
          <ul className="divide-y divide-brand-border/40">
            {order.items.map((it) => {
              let itemStatusColor = "text-brand-muted bg-brand-surface2";
              let statusLabelEn = it.status;
              let statusLabelAm = it.status;

              if (it.status === "NEW") {
                itemStatusColor = "text-brand-accent bg-brand-accent/10 border border-brand-accent/20";
                statusLabelEn = "Queued";
                statusLabelAm = "ተሰልፏል";
              } else if (it.status === "PREPARING" || it.status === "ACCEPTED" || it.status === "PLATING") {
                itemStatusColor = "text-status-yellow bg-status-yellow/10 border border-status-yellow/20 animate-pulse-soft";
                statusLabelEn = "Preparing";
                statusLabelAm = "በዝግጅት ላይ";
              } else if (it.status === "READY") {
                itemStatusColor = "text-status-blue bg-status-blue/10 border border-status-blue/20";
                statusLabelEn = "Ready";
                statusLabelAm = "ዝግጁ";
              } else if (it.status === "DELIVERED") {
                itemStatusColor = "text-brand-muted bg-brand-surface2";
                statusLabelEn = "Served";
                statusLabelAm = "ቀረበ";
              } else if (it.status === "VOIDED") {
                itemStatusColor = "text-status-attention bg-status-attention/10 border border-status-attention/20";
                statusLabelEn = "Cancelled";
                statusLabelAm = "ተሰርዟል";
              }

              return (
                <li key={it.id} className="flex items-center justify-between py-3 gap-3 first:pt-1">
                  <div className="flex flex-col">
                    <span className="font-medium text-sm text-white">
                      {it.quantity}× {tr(it.name, it.nameAm)}
                    </span>
                    {it.notes && (
                      <span className="text-xs text-brand-muted italic mt-0.5">
                        "{it.notes}"
                      </span>
                    )}
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${itemStatusColor}`}>
                    {lang === "en" ? statusLabelEn : statusLabelAm}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="mt-8 pt-4 border-t border-brand-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <p className="text-xs text-brand-muted leading-snug">
            {currentStep === 4
              ? (lang === "en" ? "Your order has been fully served. Enjoy your meal!" : "ትዕዛዝዎ ሙሉ በሙሉ ቀርቧል። መልካም ምግብ!")
              : currentStep === -1
              ? (lang === "en" ? "This order was cancelled." : "ይህ ትዕዛዝ ተሰርዟል።")
              : (lang === "en" ? "Please keep this page open to track preparation progress." : "እባክዎን የዝግጅቱን ሂደት ለመከታተል ይህንን ገጽ ክፍት ያድርጉት።")}
          </p>
          {(currentStep === 4 || currentStep === -1) && (
            <Button onClick={onClear} size="sm" className="whitespace-nowrap">
              {lang === "en" ? "Order More / Menu" : "ተጨማሪ እዘዝ / ምናሌ"}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
