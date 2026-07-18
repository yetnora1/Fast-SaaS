"use client";
import { useState, useEffect } from "react";
import { api } from "@/components/fetcher";
import { Button, Input, Field } from "@/components/ui";

interface PrinterConfig {
  type: "browser" | "network" | "usb" | "bluetooth";
  ip?: string;
  port?: number;
  vendorId?: number;
  productId?: number;
}

export function PrinterSettings({ branchId }: { branchId: string }) {
  const [config, setConfig] = useState<PrinterConfig>({ type: "browser" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [testMsg, setTestMsg] = useState<string | null>(null);

  useEffect(() => {
    api<{ printer: PrinterConfig }>(`/api/owner/branches/printer?branchId=${branchId}`)
      .then((r) => setConfig(r.printer))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [branchId]);

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      await api("/api/owner/branches/printer", {
        method: "PATCH",
        body: JSON.stringify({ branchId, printer: config }),
      });
      setMsg("Saved ✓");
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function testPrint() {
    setTestMsg(null);
    try {
      // Save first, then test
      await save();
      setTestMsg("Settings saved. Print from the cashier POS to test the connection.");
    } catch (e) {
      setTestMsg((e as Error).message);
    }
  }

  if (loading) return <div className="text-sm text-brand-muted py-8 text-center">Loading printer settings...</div>;

  const types = [
    { value: "browser" as const, label: "🌐 Browser Print", desc: "Uses browser's window.print() dialog. Works with any printer installed on the computer." },
    { value: "network" as const, label: "📡 Network / WiFi", desc: "Sends ESC/POS directly to a thermal printer over TCP. Requires the printer's IP address." },
    { value: "usb" as const, label: "🔌 USB Direct", desc: "Prints via USB-connected thermal printer. Requires escpos npm packages on the server." },
    { value: "bluetooth" as const, label: "📲 Bluetooth", desc: "Sends ESC/POS via Web Bluetooth. The cashier pairs with the printer from their browser." },
  ];

  return (
    <div className="space-y-5">
      <div>
        <div className="font-display font-bold text-sm mb-3">Printer Connection Type</div>
        <div className="grid gap-2 sm:grid-cols-2">
          {types.map((t) => (
            <button
              key={t.value}
              onClick={() => setConfig({ ...config, type: t.value })}
              className={`text-left rounded-xl border p-3 transition-all ${
                config.type === t.value
                  ? "border-brand-accent bg-brand-accent/10"
                  : "border-brand-border bg-brand-surface2 hover:border-brand-accent/40"
              }`}
            >
              <div className="font-medium text-sm">{t.label}</div>
              <div className="text-xs text-brand-muted mt-0.5">{t.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {config.type === "network" && (
        <div className="space-y-3">
          <Field label="Printer IP Address">
            <Input
              placeholder="192.168.1.100"
              value={config.ip ?? ""}
              onChange={(e) => setConfig({ ...config, ip: e.target.value })}
            />
          </Field>
          <Field label="Port (default: 9100)">
            <Input
              type="number"
              placeholder="9100"
              value={config.port?.toString() ?? ""}
              onChange={(e) => setConfig({ ...config, port: e.target.value ? parseInt(e.target.value) : undefined })}
            />
          </Field>
          <div className="rounded-lg bg-brand-accent/5 border border-brand-accent/20 p-3 text-xs text-brand-muted space-y-1">
            <div className="font-semibold text-brand-accentText">Setup Guide</div>
            <div>1. Connect your thermal printer to the same WiFi network</div>
            <div>2. Find the printer&apos;s IP address (usually printed on a self-test page)</div>
            <div>3. Enter the IP above. Default port is 9100 for most Epson/Star printers</div>
            <div>4. Common printers: Epson TM-T20, TM-T82, Star TSP100, TSP650</div>
          </div>
        </div>
      )}

      {config.type === "usb" && (
        <div className="rounded-lg bg-status-yellow/10 border border-status-yellow/20 p-3 text-xs text-brand-muted space-y-1">
          <div className="font-semibold text-status-yellowText">USB Setup Required</div>
          <div>USB printing requires server-side packages. Run on your server:</div>
          <code className="block mt-1 rounded bg-brand-bg/60 px-2 py-1 font-mono text-[11px]">npm install escpos escpos-usb</code>
          <div className="mt-1">The printer must be connected to the same machine running the server.</div>
        </div>
      )}

      {config.type === "bluetooth" && (
        <div className="rounded-lg bg-brand-accent/5 border border-brand-accent/20 p-3 text-xs text-brand-muted space-y-1">
          <div className="font-semibold text-brand-accentText">Bluetooth Printing</div>
          <div>When the cashier prints a receipt, the browser will prompt them to pair with a nearby Bluetooth thermal printer.</div>
          <div>Works with most Bluetooth-enabled ESC/POS printers (e.g. Rongta RPP02N, MUNBYN).</div>
          <div className="mt-1 text-status-yellowText">⚠️ Requires HTTPS and Chrome/Edge browser with Bluetooth support.</div>
        </div>
      )}

      <div className="flex gap-2">
        <Button onClick={save} loading={saving} className="flex-1">Save Printer Settings</Button>
        <Button variant="ghost" onClick={testPrint}>Test</Button>
      </div>
      {msg && <p className="text-sm text-brand-accentText">{msg}</p>}
      {testMsg && <p className="text-sm text-brand-muted">{testMsg}</p>}
    </div>
  );
}
