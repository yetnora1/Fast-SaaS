"use client";
import { useState, useEffect, useMemo } from "react";
import { api, usePoll } from "@/components/fetcher";
import { Button, Select, Input, Spinner, Modal } from "@/components/ui";
import { PlusIcon, AlertTriangleIcon, CoinsIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

type BaseUnit = "KG" | "L" | "PIECE";
type RecipeUnit = "G" | "KG" | "ML" | "L" | "PIECE";

const UNITS_FOR_BASE: Record<BaseUnit, RecipeUnit[]> = {
  KG: ["G", "KG"],
  L: ["ML", "L"],
  PIECE: ["PIECE"],
};

const UNIT_LABEL: Record<RecipeUnit, string> = {
  G: "g", KG: "kg", ML: "ml", L: "L", PIECE: "pcs",
};

const BASE_LABEL: Record<BaseUnit, string> = {
  KG: "solid — priced per kg",
  L: "liquid — priced per litre",
  PIECE: "countable — priced per piece",
};

interface Ingredient {
  id: string;
  name: string;
  baseUnit: BaseUnit;
  branches: { branchId: string; branchName: string; costPerUnit: number; quantity: number }[];
}

interface Line {
  ingredientId: string;
  ingredientName: string;
  baseUnit: BaseUnit;
  quantity: number;
  unit: RecipeUnit;
}

interface BranchCost {
  branchId: string;
  branchName: string;
  cost: number;
  margin: number;
  profit: number;
  missingIngredients: string[];
  lines: { ingredientName: string; quantity: number; unit: RecipeUnit; costPerUnit: number | null; lineCost: number }[];
}

const money = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Recipe editor for one menu item.
 *
 * The owner encodes what a single serving consumes; the cost underneath is
 * computed live from what the store paid, per branch. Nothing here is typed
 * twice — prices come from the store, not from this form.
 */
export function RecipeEditor({ menuItemId, price }: { menuItemId: string; price: number }) {
  const { data, reload } = usePoll<{
    lines: Line[];
    branchCosts: BranchCost[];
    hasRecipe: boolean;
  }>(`/api/owner/menu/items/${menuItemId}/recipe`, 0);
  const { data: cat, reload: reloadCat } = usePoll<{
    ingredients: Ingredient[];
    importable: { name: string; unit: string; baseUnit: BaseUnit }[];
  }>("/api/owner/ingredients", 0);

  const [lines, setLines] = useState<Line[]>([]);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);

  useEffect(() => { if (data?.lines) { setLines(data.lines); setDirty(false); } }, [data?.lines]);

  const ingredients = useMemo(() => cat?.ingredients ?? [], [cat]);
  const used = new Set(lines.map((l) => l.ingredientId));
  const available = ingredients.filter((i) => !used.has(i.id));

  function addLine(ing: Ingredient) {
    setLines((prev) => [...prev, {
      ingredientId: ing.id,
      ingredientName: ing.name,
      baseUnit: ing.baseUnit,
      quantity: 0,
      // Default to the small unit — recipes are written in grams and millilitres.
      unit: UNITS_FOR_BASE[ing.baseUnit][0],
    }]);
    setDirty(true);
  }

  function update(idx: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
    setDirty(true);
  }

  function remove(idx: number) {
    setLines((prev) => prev.filter((_, i) => i !== idx));
    setDirty(true);
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/owner/menu/items/${menuItemId}/recipe`, {
        method: "PUT",
        body: JSON.stringify({ lines: lines.map((l) => ({ ingredientId: l.ingredientId, quantity: Number(l.quantity), unit: l.unit })) }),
      });
      setDirty(false);
      reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function importFromStore() {
    setBusy(true);
    try {
      await api("/api/owner/ingredients/import", { method: "POST" });
      reloadCat();
    } finally {
      setBusy(false);
    }
  }

  if (!data || !cat) return <div className="flex justify-center py-6"><Spinner /></div>;

  const primary = data.branchCosts[0];

  return (
    <div className="space-y-3 rounded-xl border border-brand-border bg-brand-surface2/50 p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-bold uppercase tracking-[0.12em] text-brand-muted">Recipe — what one serving uses</span>
        {dirty && (
          <Button size="sm" onClick={save} loading={busy}>Save recipe</Button>
        )}
      </div>

      {ingredients.length === 0 ? (
        <div className="space-y-2 rounded-lg border border-dashed border-brand-border p-4 text-center">
          <p className="text-sm text-brand-muted">
            No ingredients yet. {cat.importable.length > 0
              ? `Import the ${cat.importable.length} item${cat.importable.length === 1 ? "" : "s"} already in your store to get started.`
              : "Add what you stock in the store first."}
          </p>
          {cat.importable.length > 0 && (
            <Button size="sm" onClick={importFromStore} loading={busy}>
              Import {cat.importable.length} from store
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* Lines */}
          <div className="space-y-2">
            {lines.length === 0 && (
              <p className="py-2 text-center text-xs text-brand-muted">
                No ingredients yet — this item uses its manually entered cost.
              </p>
            )}
            {lines.map((l, idx) => {
              const ing = ingredients.find((i) => i.id === l.ingredientId);
              const branchPrice = ing?.branches[0]?.costPerUnit ?? null;
              const factor = l.unit === "G" || l.unit === "ML" ? 0.001 : 1;
              const lineCost = branchPrice === null ? null : Number(l.quantity) * factor * branchPrice;
              return (
                <div key={l.ingredientId} className="grid grid-cols-[1fr_5rem_5rem_auto] items-center gap-2">
                  <span className="truncate text-sm font-medium text-brand-foreground">{l.ingredientName}</span>
                  <Input
                    type="number"
                    min={0}
                    step="0.001"
                    value={l.quantity || ""}
                    onChange={(e) => update(idx, { quantity: Number(e.target.value) })}
                    className="!min-h-[38px] text-sm"
                    aria-label={`${l.ingredientName} quantity`}
                  />
                  <Select
                    value={l.unit}
                    onChange={(e) => update(idx, { unit: e.target.value as RecipeUnit })}
                    className="!min-h-[38px] text-sm"
                    aria-label={`${l.ingredientName} unit`}
                  >
                    {UNITS_FOR_BASE[l.baseUnit].map((u) => (
                      <option key={u} value={u}>{UNIT_LABEL[u]}</option>
                    ))}
                  </Select>
                  <span className="flex items-center gap-2">
                    <span className={cn("tabular w-20 text-right text-xs", lineCost === null ? "text-status-yellowText" : "text-brand-muted")}>
                      {lineCost === null ? "no price" : `${money(lineCost)} ETB`}
                    </span>
                    <button
                      onClick={() => remove(idx)}
                      className="rounded-md px-1.5 py-1 text-xs text-status-redText transition-colors hover:bg-status-red/10"
                      aria-label={`Remove ${l.ingredientName}`}
                    >
                      ✕
                    </button>
                  </span>
                </div>
              );
            })}
          </div>

          {/* Add */}
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value=""
              onChange={(e) => { const i = ingredients.find((x) => x.id === e.target.value); if (i) addLine(i); }}
              className="!min-h-[38px] w-auto min-w-[12rem] text-sm"
              aria-label="Add ingredient"
              disabled={available.length === 0}
            >
              <option value="">{available.length ? "+ Add ingredient…" : "All ingredients added"}</option>
              {available.map((i) => (
                <option key={i.id} value={i.id}>{i.name} ({UNIT_LABEL[UNITS_FOR_BASE[i.baseUnit][0]]})</option>
              ))}
            </Select>
            <Button variant="ghost" size="sm" onClick={() => setNewOpen(true)}>
              <PlusIcon className="h-3.5 w-3.5" />
              New ingredient
            </Button>
          </div>

          {error && <p className="text-sm text-status-redText">{error}</p>}

          {/* Costed result */}
          {primary && (
            <div className="space-y-2 rounded-lg border border-brand-border bg-brand-surface p-3">
              {data.branchCosts.map((b) => (
                <div key={b.branchId} className="space-y-1">
                  {data.branchCosts.length > 1 && (
                    <div className="text-[11px] font-bold uppercase tracking-wider text-brand-muted">{b.branchName}</div>
                  )}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="inline-flex items-center gap-1.5 text-brand-muted">
                      <CoinsIcon className="h-4 w-4 text-brand-accentText" />
                      Ingredient cost
                    </span>
                    <span className="tabular font-bold text-brand-foreground">{money(b.cost)} ETB</span>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="text-brand-muted">Profit per serving</span>
                    <span className="tabular font-bold text-status-greenText">
                      {money(b.profit)} ETB
                      <span className="ml-1.5 font-medium text-brand-muted">({b.margin.toFixed(1)}%)</span>
                    </span>
                  </div>
                  {/* A missing price silently understates cost, so say so loudly. */}
                  {b.missingIngredients.length > 0 && (
                    <p className="flex items-start gap-1.5 rounded-md bg-status-yellow/10 px-2 py-1.5 text-[11px] leading-5 text-status-yellowText">
                      <AlertTriangleIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>
                        No price for {b.missingIngredients.join(", ")} at {b.branchName} — counted as 0, so the real cost is higher.
                        Receive it in the store to fix.
                      </span>
                    </p>
                  )}
                </div>
              ))}
              <p className="border-t border-brand-border pt-2 text-[11px] leading-5 text-brand-muted">
                Cost is recalculated from store prices. Sold items keep the cost they had at the time of sale.
              </p>
            </div>
          )}
        </>
      )}

      {newOpen && (
        <NewIngredientModal
          onClose={() => setNewOpen(false)}
          onCreated={() => { setNewOpen(false); reloadCat(); }}
        />
      )}
    </div>
  );
}

function NewIngredientModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [baseUnit, setBaseUnit] = useState<BaseUnit>("KG");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/api/owner/ingredients", { method: "POST", body: JSON.stringify({ name, baseUnit }) });
      onCreated();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="New ingredient">
      <form onSubmit={submit} className="space-y-3">
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-brand-foreground">Name</span>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sugar" required />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-brand-foreground">How is it stocked?</span>
          <Select value={baseUnit} onChange={(e) => setBaseUnit(e.target.value as BaseUnit)}>
            {(Object.keys(BASE_LABEL) as BaseUnit[]).map((b) => (
              <option key={b} value={b}>{BASE_LABEL[b]}</option>
            ))}
          </Select>
          <span className="block text-xs text-brand-muted">
            Recipes for solids are entered in grams, liquids in millilitres.
          </span>
        </label>
        {error && <p className="text-sm text-status-redText">{error}</p>}
        <div className="flex gap-2 pt-1">
          <Button type="button" variant="ghost" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button type="submit" className="flex-1" loading={busy} disabled={!name.trim()}>Add</Button>
        </div>
      </form>
    </Modal>
  );
}
