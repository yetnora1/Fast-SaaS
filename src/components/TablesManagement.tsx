"use client";
import React, { useState, useEffect } from "react";
import { api, usePoll } from "@/components/fetcher";
import { Button, Card, Input, Select, Field, Spinner, EmptyState } from "@/components/ui";
import { ClipboardIcon, PlusIcon } from "@/components/icons";
import { useLang } from "@/lib/i18n";
import QRCode from "qrcode";

interface Table {
  id: string;
  number: number;
  capacity: number;
  shape: "round" | "square" | "rectangle" | "booth";
  status: "available" | "occupied" | "attention" | "dirty";
}

interface TablesManagementProps {
  branchId: string;
  branchName: string;
}

export function TablesManagement({ branchId, branchName }: { branchId: string; branchName: string }) {
  const { t, lang } = useLang();
  const { data: tablesData, loading, reload } = usePoll<{ tables: Table[] }>(
    branchId ? `/api/manager/tables?branchId=${branchId}` : null,
    5000
  );
  
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Table>>({});
  const [saving, setSaving] = useState(false);
  const [qrUrls, setQrUrls] = useState<Record<number, string>>({});
  const [qrPrintUrls, setQrPrintUrls] = useState<Record<number, string>>({});

  // Generate QR code data URLs on load / table changes
  useEffect(() => {
    if (!tablesData?.tables) return;

    const generateQrs = async () => {
      const urls: Record<number, string> = {};
      const printUrls: Record<number, string> = {};
      
      const host = typeof window !== "undefined" ? window.location.origin : "";
      
      for (const table of tablesData.tables) {
        const orderUrl = `${host}/qr/${branchId}?table=${table.number}`;
        
        // 1. Dashboard View (Themed Dark-Emerald QR)
        try {
          const darkUrl = await QRCode.toDataURL(orderUrl, {
            errorCorrectionLevel: "M",
            margin: 1,
            color: {
              dark: "#22c55e", // emerald green
              light: "#0f172a", // slate dark background
            },
          });
          urls[table.number] = darkUrl;
        } catch (e) {
          console.error(e);
        }

        // 2. Print View (High Contrast Black-on-White QR)
        try {
          const lightUrl = await QRCode.toDataURL(orderUrl, {
            errorCorrectionLevel: "H",
            margin: 1,
            color: {
              dark: "#000000",
              light: "#ffffff",
            },
          });
          printUrls[table.number] = lightUrl;
        } catch (e) {
          console.error(e);
        }
      }
      setQrUrls(urls);
      setQrPrintUrls(printUrls);
    };

    generateQrs();
  }, [tablesData, branchId]);

  // Actions
  const handleAddTable = async () => {
    setAdding(true);
    try {
      await api(`/api/manager/tables`, {
        method: "POST",
        body: JSON.stringify({ branchId }),
      });
      reload();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setAdding(false);
    }
  };

  const handleStartEdit = (table: Table) => {
    setEditingId(table.id);
    setEditForm({ capacity: table.capacity, shape: table.shape, status: table.status });
  };

  const handleSaveEdit = async (id: string) => {
    setSaving(true);
    try {
      await api(`/api/manager/tables/${id}`, {
        method: "PATCH",
        body: JSON.stringify(editForm),
      });
      setEditingId(null);
      reload();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTable = async (id: string) => {
    if (!confirm(lang === "en" ? "Are you sure you want to delete this table?" : "ይህን ጠረጴዛ መሰረዝ እርግጠኛ ነዎት?")) return;
    try {
      await api(`/api/manager/tables/${id}`, { method: "DELETE" });
      reload();
    } catch (e) {
      alert((e as Error).message);
    }
  };

  // Printing functions
  const handlePrintSingle = (table: Table) => {
    const printUrl = qrPrintUrls[table.number];
    if (!printUrl) return;

    const host = typeof window !== "undefined" ? window.location.origin : "";
    const orderUrl = `${host}/qr/${branchId}?table=${table.number}`;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Table ${table.number} QR Code</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Karla:wght@400;700&family=Playfair+Display:wght@700&display=swap');
            body {
              font-family: 'Karla', sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              background: #f8fafc;
            }
            .ticket {
              background: white;
              border: 3px solid #0f172a;
              border-radius: 24px;
              padding: 36px;
              width: 320px;
              text-align: center;
              box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05);
            }
            .brand {
              font-family: 'Playfair Display', serif;
              font-size: 24px;
              font-weight: bold;
              color: #0f172a;
              margin-bottom: 2px;
            }
            .branch {
              font-size: 13px;
              color: #64748b;
              margin-bottom: 16px;
              font-weight: 500;
            }
            .number-tag {
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 0.15em;
              color: #94a3b8;
              font-weight: 700;
            }
            .number {
              font-size: 64px;
              font-weight: 900;
              color: #c87a53;
              line-height: 1;
              margin: 2px 0 20px;
            }
            .qr-image {
              width: 200px;
              height: 200px;
              margin: 0 auto 20px;
              display: block;
            }
            .scan-text {
              font-size: 14px;
              font-weight: 700;
              color: #0f172a;
              margin-bottom: 4px;
            }
            .url-text {
              font-size: 11px;
              color: #64748b;
              word-break: break-all;
              max-width: 240px;
              margin: 0 auto;
              font-family: monospace;
            }
            @media print {
              body { background: white; }
              .ticket { box-shadow: none; border-color: #000; }
            }
          </style>
        </head>
        <body>
          <div class="ticket">
            <div class="brand">ZAD Cafe</div>
            <div class="branch">${branchName}</div>
            <div class="number-tag">${lang === "en" ? "Table" : "ጠረጴዛ"}</div>
            <div class="number">${table.number}</div>
            <img class="qr-image" src="${printUrl}" alt="Table ${table.number} QR" />
            <div class="scan-text">${lang === "en" ? "Scan to Order" : "ስልኮን አስጠግተው ይዘዙ"}</div>
            <div class="url-text">${orderUrl}</div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              window.close();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handlePrintAll = () => {
    if (!tablesData?.tables || tablesData.tables.length === 0) return;

    const host = typeof window !== "undefined" ? window.location.origin : "";
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const ticketsHtml = tablesData.tables
      .map((table) => {
        const printUrl = qrPrintUrls[table.number];
        const orderUrl = `${host}/qr/${branchId}?table=${table.number}`;
        if (!printUrl) return "";
        return `
          <div class="ticket">
            <div class="brand">ZAD Cafe</div>
            <div class="branch">${branchName}</div>
            <div class="number-tag">${lang === "en" ? "Table" : "ጠረጴዛ"}</div>
            <div class="number">${table.number}</div>
            <img class="qr-image" src="${printUrl}" alt="Table ${table.number} QR" />
            <div class="scan-text">${lang === "en" ? "Scan to Order" : "ስልኮን አስጠግተው ይዘዙ"}</div>
            <div class="url-text">${orderUrl}</div>
          </div>
        `;
      })
      .join("");

    printWindow.document.write(`
      <html>
        <head>
          <title>All Table QR Codes - ${branchName}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Karla:wght@400;700&family=Playfair+Display:wght@700&display=swap');
            body {
              font-family: 'Karla', sans-serif;
              margin: 0;
              padding: 20px;
              background: #f8fafc;
            }
            .grid {
              display: grid;
              grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
              gap: 24px;
            }
            .ticket {
              background: white;
              border: 3px solid #0f172a;
              border-radius: 24px;
              padding: 28px;
              text-align: center;
              box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05);
              page-break-inside: avoid;
            }
            .brand {
              font-family: 'Playfair Display', serif;
              font-size: 22px;
              font-weight: bold;
              color: #0f172a;
              margin-bottom: 2px;
            }
            .branch {
              font-size: 12px;
              color: #64748b;
              margin-bottom: 12px;
              font-weight: 500;
            }
            .number-tag {
              font-size: 10px;
              text-transform: uppercase;
              letter-spacing: 0.15em;
              color: #94a3b8;
              font-weight: 700;
            }
            .number {
              font-size: 52px;
              font-weight: 900;
              color: #c87a53;
              line-height: 1;
              margin: 2px 0 16px;
            }
            .qr-image {
              width: 170px;
              height: 170px;
              margin: 0 auto 16px;
              display: block;
            }
            .scan-text {
              font-size: 13px;
              font-weight: 700;
              color: #0f172a;
              margin-bottom: 4px;
            }
            .url-text {
              font-size: 10px;
              color: #64748b;
              word-break: break-all;
              max-width: 220px;
              margin: 0 auto;
              font-family: monospace;
            }
            @media print {
              body { background: white; padding: 0; }
              .ticket { box-shadow: none; border-color: #000; }
            }
          </style>
        </head>
        <body>
          <div class="grid">
            ${ticketsHtml}
          </div>
          <script>
            window.onload = function() {
              window.print();
              window.close();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownloadQr = (table: Table) => {
    const printUrl = qrPrintUrls[table.number];
    if (!printUrl) return;
    const a = document.createElement("a");
    a.href = printUrl;
    a.download = `table-${table.number}-qr.png`;
    a.click();
  };

  if (loading && !tablesData) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Action Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-border/40 bg-brand-surface/40 p-4">
        <div>
          <h2 className="font-display text-lg font-bold text-brand-foreground">
            {lang === "am" ? "የጠረጴዛዎች ማዋቀር & QR ኮዶች" : "Table Setup & QR Codes"}
          </h2>
          <p className="text-xs text-brand-muted">
            {lang === "am" ? `${tablesData?.tables.length || 0} ጠረጴዛዎች በ ${branchName}` : `${tablesData?.tables.length || 0} tables in ${branchName}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handlePrintAll} disabled={!tablesData?.tables || tablesData.tables.length === 0} variant="ghost" size="sm">
            <ClipboardIcon className="h-4 w-4" />
            {lang === "am" ? "ሁሉንም አትም" : "Print All Codes"}
          </Button>
          <Button onClick={handleAddTable} loading={adding} size="sm">
            <PlusIcon className="h-4 w-4" />
            {lang === "am" ? "ጠረጴዛ ጨምር" : "Add Table"}
          </Button>
        </div>
      </div>

      {/* Tables Grid */}
      {tablesData?.tables.length === 0 ? (
        <EmptyState icon={<ClipboardIcon className="h-7 w-7" />}>
          {lang === "am" ? "በዚህ ቅርንጫፍ ላይ ምንም ጠረጴዛ አልተፈጠረም" : "No tables created in this branch yet"}
        </EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {tablesData?.tables.map((table) => {
            const isEditing = editingId === table.id;
            const darkQrUrl = qrUrls[table.number];

            return (
              <Card key={table.id} className="relative overflow-hidden group border border-brand-border/60 hover:border-brand-border transition-all duration-300">
                {/* Visual table state badge in top corner */}
                <div className="absolute top-3 right-3 flex items-center gap-1.5">
                  <span className={`h-2.5 w-2.5 rounded-full ${
                    table.status === "available" ? "bg-status-green animate-pulse" :
                    table.status === "occupied" ? "bg-status-yellow" :
                    table.status === "attention" ? "bg-status-red" : "bg-brand-muted"
                  }`} />
                  <span className="text-[10px] text-brand-muted capitalize font-semibold">{table.status}</span>
                </div>

                {/* Table Number Title */}
                <div className="mb-4">
                  <span className="text-[10px] uppercase tracking-wider text-brand-muted font-bold">
                    {lang === "am" ? "ጠረጴዛ" : "Table"}
                  </span>
                  <h3 className="font-display text-4xl font-extrabold text-[#c87a53]">
                    #{table.number}
                  </h3>
                </div>

                {/* Styled Dark QR Image Preview */}
                <div className="my-4 flex justify-center">
                  <div className="relative rounded-2xl border border-brand-border/60 bg-slate-950 p-2.5 shadow-inner transition-transform duration-300 group-hover:scale-105">
                    {darkQrUrl ? (
                      <img src={darkQrUrl} alt={`Table ${table.number} QR`} className="h-36 w-36 object-contain rounded-lg" />
                    ) : (
                      <div className="h-36 w-36 flex items-center justify-center">
                        <Spinner className="h-6 w-6 text-brand-accent" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Edit Form / Details Section */}
                <div className="space-y-3 pt-2">
                  {isEditing ? (
                    <div className="space-y-2.5 border-t border-brand-border/40 pt-3">
                      <Field label={lang === "am" ? "የመቀመጫ ብዛት" : "Capacity"}>
                        <Input
                          type="number"
                          value={editForm.capacity}
                          onChange={(e) => setEditForm({ ...editForm, capacity: Number(e.target.value) })}
                        />
                      </Field>
                      <Field label={lang === "am" ? "ቅርጽ" : "Shape"}>
                        <Select
                          value={editForm.shape}
                          onChange={(e) => setEditForm({ ...editForm, shape: e.target.value as any })}
                        >
                          <option value="round">Round</option>
                          <option value="square">Square</option>
                          <option value="rectangle">Rectangle</option>
                          <option value="booth">Booth</option>
                        </Select>
                      </Field>
                      <Field label={lang === "am" ? "ሁኔታ" : "Status"}>
                        <Select
                          value={editForm.status}
                          onChange={(e) => setEditForm({ ...editForm, status: e.target.value as any })}
                        >
                          <option value="available">Available</option>
                          <option value="occupied">Occupied</option>
                          <option value="attention">Attention</option>
                          <option value="dirty">Dirty</option>
                        </Select>
                      </Field>
                      
                      <div className="flex gap-1.5 pt-1">
                        <Button onClick={() => handleSaveEdit(table.id)} loading={saving} size="sm" className="flex-1">
                          {t("save")}
                        </Button>
                        <Button onClick={() => setEditingId(null)} variant="ghost" size="sm" className="flex-1">
                          {t("cancel")}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2.5 border-t border-brand-border/40 pt-3">
                      <div className="flex justify-between text-xs">
                        <span className="text-brand-muted">{lang === "am" ? "አቅም" : "Capacity"}</span>
                        <span className="font-semibold text-brand-foreground">{table.capacity} {lang === "am" ? "ሰው" : "seats"}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-brand-muted">{lang === "am" ? "ቅርጽ" : "Shape"}</span>
                        <span className="font-semibold text-brand-foreground capitalize">{table.shape}</span>
                      </div>

                      {/* Card Action Buttons */}
                      <div className="flex flex-wrap gap-1.5 pt-2">
                        <Button onClick={() => handlePrintSingle(table)} variant="ghost" size="sm" className="flex-1 text-[11px] px-2 h-8">
                          {lang === "am" ? "አትም" : "Print Ticket"}
                        </Button>
                        <Button onClick={() => handleDownloadQr(table)} variant="ghost" size="sm" className="flex-1 text-[11px] px-2 h-8">
                          {lang === "am" ? "አውርድ" : "Download QR"}
                        </Button>
                      </div>
                      
                      <div className="flex gap-1.5 pt-1">
                        <button
                          onClick={() => handleStartEdit(table)}
                          className="text-[11px] text-brand-muted hover:text-brand-foreground transition-colors font-medium flex-1 text-center py-1"
                        >
                          {lang === "am" ? "አስተካክል" : "Edit Config"}
                        </button>
                        <button
                          onClick={() => handleDeleteTable(table.id)}
                          className="text-[11px] text-red-500 hover:text-red-400 transition-colors font-medium flex-1 text-center py-1"
                        >
                          {lang === "am" ? "አስወግድ" : "Delete"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
