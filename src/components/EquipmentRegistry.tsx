"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api, usePoll } from "@/components/fetcher";
import {
  Card,
  PageHeader,
  Button,
  Input,
  Select,
  Field,
  Modal,
  EmptyState,
  Spinner,
} from "@/components/ui";
import { useLang } from "@/lib/i18n";

/* ── Types ─────────────────────────────────────────────────────────── */

interface EquipmentItem {
  id: string;
  name: string;
  category: string;
  department: "BARISTA" | "KITCHEN" | "SHARED";
  quantity: number;
  condition: "NEW" | "GOOD" | "WORN" | "NEEDS_REPAIR" | "RETIRED";
  storageArea: string | null;
  purchaseDate: string | null;
  lastMaintenance: string | null;
  notes: string | null;
  createdBy: string;
  creator: { id: string; name: string };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

type SortKey = "name" | "category" | "department" | "quantity" | "condition" | "updatedAt";
type SortDir = "asc" | "desc";

const DEPARTMENTS = ["BARISTA", "KITCHEN", "SHARED"] as const;
const CONDITIONS = ["NEW", "GOOD", "WORN", "NEEDS_REPAIR", "RETIRED"] as const;
const CATEGORIES = [
  "Cups & Mugs",
  "Glassware",
  "Utensils",
  "Brewing Tools",
  "Kitchen Appliances",
  "Cleaning Supplies",
  "Other",
];

/* ── Helpers ──────────────────────────────────────────────────────── */

const fmtDate = (s: string | null) => {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return "—";
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const DEPT_DICT_KEY: Record<string, string> = {
  BARISTA: "deptBarista",
  KITCHEN: "deptKitchen",
  SHARED: "deptShared",
};

const COND_DICT_KEY: Record<string, string> = {
  NEW: "condNew",
  GOOD: "condGood",
  WORN: "condWorn",
  NEEDS_REPAIR: "condNeedsRepair",
  RETIRED: "condRetired",
};

const CAT_DICT_KEY: Record<string, string> = {
  "Cups & Mugs": "catCupsMugs",
  Glassware: "catGlassware",
  Utensils: "catUtensils",
  "Brewing Tools": "catBrewingTools",
  "Kitchen Appliances": "catKitchenAppliances",
  "Cleaning Supplies": "catCleaningSupplies",
  Other: "catOther",
};

const COND_COLOR: Record<string, string> = {
  NEW: "bg-status-green/15 text-status-greenText",
  GOOD: "bg-status-green/15 text-status-greenText",
  WORN: "bg-status-yellow/15 text-status-yellowText",
  NEEDS_REPAIR: "bg-status-red/15 text-status-redText",
  RETIRED: "bg-white/10 text-brand-muted",
};

/* ── Component ────────────────────────────────────────────────────── */

export function EquipmentRegistry() {
  const { t, lang } = useLang();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  /* Filters */
  const [deptFilter, setDeptFilter] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [condFilter, setCondFilter] = useState("");
  const [qtyFilter, setQtyFilter] = useState("");
  const [search, setSearch] = useState("");

  /* Sort */
  const [sortKey, setSortKey] = useState<SortKey>("updatedAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  /* Modals */
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<EquipmentItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EquipmentItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  /* Export dropdown */
  const [exportOpen, setExportOpen] = useState(false);

  /* API query */
  const queryParams = useMemo(() => {
    const p = new URLSearchParams();
    if (deptFilter) p.set("department", deptFilter);
    if (catFilter) p.set("category", catFilter);
    if (condFilter) p.set("condition", condFilter);
    if (qtyFilter) p.set("quantity", qtyFilter);
    if (search.trim()) p.set("search", search.trim());
    return p.toString();
  }, [deptFilter, catFilter, condFilter, qtyFilter, search]);

  const { data, loading, reload } = usePoll<{ items: EquipmentItem[] }>(
    `/api/equipment${queryParams ? `?${queryParams}` : ""}`,
    0, // no polling, manual reload
  );

  const rawItems = useMemo(() => data?.items ?? [], [data]);

  /* Client-side sort */
  const items = useMemo(() => {
    const sorted = [...rawItems];
    sorted.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "name":
          cmp = a.name.localeCompare(b.name);
          break;
        case "category":
          cmp = a.category.localeCompare(b.category);
          break;
        case "department":
          cmp = a.department.localeCompare(b.department);
          break;
        case "quantity":
          cmp = a.quantity - b.quantity;
          break;
        case "condition":
          cmp = CONDITIONS.indexOf(a.condition) - CONDITIONS.indexOf(b.condition);
          break;
        case "updatedAt":
          cmp = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [rawItems, sortKey, sortDir]);

  /* Unique categories from data (for filter dropdown) */
  const knownCategories = useMemo(() => {
    const cats = new Set(CATEGORIES);
    rawItems.forEach((i) => cats.add(i.category));
    return Array.from(cats).sort();
  }, [rawItems]);

  /* Sort handler */
  const toggleSort = useCallback(
    (key: SortKey) => {
      if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      else {
        setSortKey(key);
        setSortDir("asc");
      }
    },
    [sortKey],
  );

  /* CRUD actions */
  async function handleSave(formData: FormData) {
    setSaving(true);
    try {
      const body = {
        name: formData.get("name") as string,
        category: formData.get("category") as string,
        department: formData.get("department") as string,
        quantity: parseInt(formData.get("quantity") as string, 10),
        condition: formData.get("condition") as string,
        storageArea: (formData.get("storageArea") as string) || null,
        purchaseDate: (formData.get("purchaseDate") as string) || null,
        lastMaintenance: (formData.get("lastMaintenance") as string) || null,
        notes: (formData.get("notes") as string) || null,
      };

      if (editing) {
        await api(`/api/equipment/${editing.id}`, {
          method: "PUT",
          body: JSON.stringify(body),
        });
      } else {
        await api("/api/equipment", {
          method: "POST",
          body: JSON.stringify(body),
        });
      }
      setFormOpen(false);
      setEditing(null);
      reload();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api(`/api/equipment/${deleteTarget.id}`, { method: "DELETE" });
      setDeleteOpen(false);
      setDeleteTarget(null);
      reload();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setDeleting(false);
    }
  }

  /* Export */
  function doExport(format: "csv" | "pdf") {
    setExportOpen(false);
    const p = new URLSearchParams();
    p.set("format", format);
    if (deptFilter) p.set("department", deptFilter);
    if (catFilter) p.set("category", catFilter);
    if (condFilter) p.set("condition", condFilter);
    if (qtyFilter) p.set("quantity", qtyFilter);
    if (search.trim()) p.set("search", search.trim());
    window.open(`/api/equipment/export?${p.toString()}`, "_blank");
  }

  /* Translated labels */
  const deptLabel = (d: string) => t(DEPT_DICT_KEY[d] as any) ?? d;
  const condLabel = (c: string) => t(COND_DICT_KEY[c] as any) ?? c;
  const catLabel = (c: string) => {
    const key = CAT_DICT_KEY[c];
    return key ? t(key as any) : c;
  };

  const SortIcon = ({ col }: { col: SortKey }) =>
    sortKey === col ? (
      <span className="ml-1 text-brand-accentText">{sortDir === "asc" ? "↑" : "↓"}</span>
    ) : (
      <span className="ml-1 opacity-30">↕</span>
    );

  if (!mounted) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader title={t("equipmentTitle")} subtitle={t("equipmentSubtitle")}>
        {/* Export button */}
        <div className="relative">
          <Button variant="ghost" size="sm" onClick={() => setExportOpen(!exportOpen)}>
            {t("equipmentExport")} ▾
          </Button>
          {exportOpen && (
            <div className="absolute right-0 top-full z-10 mt-1 w-40 rounded-xl border border-brand-border bg-brand-surface p-1 shadow-pop animate-fade">
              <button
                className="w-full rounded-lg px-3 py-2 text-left text-sm text-brand-foreground hover:bg-white/10 transition-colors"
                onClick={() => doExport("csv")}
              >
                📄 {t("exportCsv")}
              </button>
              <button
                className="w-full rounded-lg px-3 py-2 text-left text-sm text-brand-foreground hover:bg-white/10 transition-colors"
                onClick={() => doExport("pdf")}
              >
                📑 {t("exportPdf")}
              </button>
            </div>
          )}
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          + {t("addEquipment")}
        </Button>
      </PageHeader>

      {/* Filters */}
      <Card className="flex flex-wrap items-end gap-3 p-3">
        <div className="min-w-[180px] flex-1">
          <Input
            placeholder={t("searchEquipment")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          className="w-auto min-w-[140px]"
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
        >
          <option value="">{t("allDepartments")}</option>
          {DEPARTMENTS.map((d) => (
            <option key={d} value={d}>
              {deptLabel(d)}
            </option>
          ))}
        </Select>
        <Select
          className="w-auto min-w-[160px]"
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value)}
        >
          <option value="">{t("allCategories")}</option>
          {knownCategories.map((c) => (
            <option key={c} value={c}>
              {catLabel(c)}
            </option>
          ))}
        </Select>
        <Select
          className="w-auto min-w-[150px]"
          value={condFilter}
          onChange={(e) => setCondFilter(e.target.value)}
        >
          <option value="">{t("allConditions")}</option>
          {CONDITIONS.map((c) => (
            <option key={c} value={c}>
              {condLabel(c)}
            </option>
          ))}
        </Select>
        <Select
          className="w-auto min-w-[150px]"
          value={qtyFilter}
          onChange={(e) => setQtyFilter(e.target.value)}
        >
          <option value="">{t("allQuantities")}</option>
          <option value="in_stock">{t("inStock")}</option>
          <option value="out_of_stock">{t("outOfStock")}</option>
        </Select>
      </Card>

      {/* Table */}
      {loading && !rawItems.length ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : items.length === 0 ? (
        <EmptyState>{t("noEquipment")}</EmptyState>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-border/60 text-left text-xs font-medium uppercase tracking-wide text-brand-muted">
                <Th col="name" label={t("name")} />
                <Th col="category" label={t("category")} />
                <Th col="department" label={t("department")} />
                <Th col="quantity" label={t("quantityLabel")} />
                <Th col="condition" label={t("conditionLabel")} />
                <Th col="updatedAt" label={t("lastUpdated")} />
                <th className="px-4 py-3">{t("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-brand-border/30 transition-colors hover:bg-white/[0.03]"
                >
                  <td className="px-4 py-3 font-medium text-brand-foreground">{item.name}</td>
                  <td className="px-4 py-3 text-brand-muted">{catLabel(item.category)}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-brand-accent/15 px-2 py-0.5 text-xs font-medium text-brand-accentText">
                      {deptLabel(item.department)}
                    </span>
                  </td>
                  <td className="px-4 py-3 tabular text-brand-foreground">{item.quantity}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${COND_COLOR[item.condition] ?? "bg-white/10 text-brand-muted"}`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {condLabel(item.condition)}
                    </span>
                  </td>
                  <td className="px-4 py-3 tabular text-brand-muted" suppressHydrationWarning>{fmtDate(item.updatedAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button
                        className="rounded-lg px-2 py-1 text-xs text-brand-accentText hover:bg-brand-accent/10 transition-colors"
                        onClick={() => {
                          setEditing(item);
                          setFormOpen(true);
                        }}
                      >
                        ✏️
                      </button>
                      <button
                        className="rounded-lg px-2 py-1 text-xs text-status-redText hover:bg-status-red/10 transition-colors"
                        onClick={() => {
                          setDeleteTarget(item);
                          setDeleteOpen(true);
                        }}
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-brand-border/40 px-4 py-2 text-xs text-brand-muted">
            {t("showing")} {items.length} {t("itemsCount")}
          </div>
        </Card>
      )}

      {/* Add/Edit Modal */}
      <Modal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        title={editing ? t("editEquipment") : t("addEquipment")}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSave(new FormData(e.currentTarget));
          }}
          className="space-y-3"
        >
          <Field label={t("name")} required>
            <Input name="name" required defaultValue={editing?.name ?? ""} />
          </Field>

          <Field label={t("category")} required>
            <Select name="category" required defaultValue={editing?.category ?? ""}>
              <option value="" disabled>
                {t("selectCategory")}
              </option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {catLabel(c)}
                </option>
              ))}
            </Select>
          </Field>

          <Field label={t("department")} required>
            <Select name="department" required defaultValue={editing?.department ?? ""}>
              <option value="" disabled>
                —
              </option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {deptLabel(d)}
                </option>
              ))}
            </Select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label={t("quantityLabel")} required>
              <Input
                name="quantity"
                type="number"
                min={0}
                required
                defaultValue={editing?.quantity ?? 0}
              />
            </Field>
            <Field label={t("conditionLabel")}>
              <Select name="condition" defaultValue={editing?.condition ?? "NEW"}>
                {CONDITIONS.map((c) => (
                  <option key={c} value={c}>
                    {condLabel(c)}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label={t("storageArea")}>
            <Input name="storageArea" defaultValue={editing?.storageArea ?? ""} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label={t("purchaseDate")}>
              <Input
                name="purchaseDate"
                type="date"
                defaultValue={editing?.purchaseDate?.split("T")[0] ?? ""}
              />
            </Field>
            <Field label={t("lastMaintenance")}>
              <Input
                name="lastMaintenance"
                type="date"
                defaultValue={editing?.lastMaintenance?.split("T")[0] ?? ""}
              />
            </Field>
          </div>

          <Field label={t("notes")}>
            <textarea
              name="notes"
              rows={2}
              defaultValue={editing?.notes ?? ""}
              className="w-full rounded-xl border border-brand-border bg-brand-surface2 px-3 py-2 text-sm text-brand-foreground outline-none transition-colors placeholder:text-brand-muted focus:border-brand-accent focus:ring-1 focus:ring-brand-accent/40"
            />
          </Field>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              type="button"
              onClick={() => {
                setFormOpen(false);
                setEditing(null);
              }}
            >
              {t("cancel")}
            </Button>
            <Button type="submit" loading={saving}>
              {saving ? t("saving") : t("saveChanges")}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={deleteOpen}
        onClose={() => {
          setDeleteOpen(false);
          setDeleteTarget(null);
        }}
        title={t("deleteEquipment")}
      >
        <p className="mb-4 text-sm text-brand-muted">{t("deleteEquipmentMsg")}</p>
        {deleteTarget && (
          <p className="mb-4 text-sm font-medium text-brand-foreground">
            &ldquo;{deleteTarget.name}&rdquo; &mdash; {catLabel(deleteTarget.category)}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            onClick={() => {
              setDeleteOpen(false);
              setDeleteTarget(null);
            }}
          >
            {t("cancel")}
          </Button>
          <Button variant="danger" onClick={handleDelete} loading={deleting}>
            {deleting ? t("deleting") : t("confirm")}
          </Button>
        </div>
      </Modal>
    </div>
  );

  function Th({ col, label }: { col: SortKey; label: string }) {
    return (
      <th
        className="cursor-pointer select-none px-4 py-3 transition-colors hover:text-brand-foreground"
        onClick={() => toggleSort(col)}
      >
        {label}
        <SortIcon col={col} />
      </th>
    );
  }
}
