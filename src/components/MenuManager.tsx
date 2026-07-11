"use client";
import { useRef, useState } from "react";
import { api, usePoll } from "@/components/fetcher";
import { Button, Card, Input, Select, Field, StatusChip, PageHeader, EmptyState } from "@/components/ui";
import { useLang } from "@/lib/i18n";

interface Modifier { id?: string; groupName: string; option: string; extraPrice: number | string }
interface MenuItem {
  id: string; name: string; nameAm: string | null; description: string | null;
  price: string; cost: string; available: boolean; state: string; station: string;
  imageUrl: string | null; modifiers: Modifier[];
}
interface Category { id: string; name: string; nameAm?: string | null; items: MenuItem[] }

const BLANK_ITEM = { categoryId: "", name: "", nameAm: "", price: "", cost: "", description: "", station: "KITCHEN", imageUrl: "" };

async function uploadImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("image", file);
  const res = await fetch("/api/owner/menu/items/upload", { method: "POST", body: fd });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.ok === false) throw new Error(json.error ?? "Upload failed");
  return json.data.url as string;
}

export function MenuManager() {
  const { t, tr } = useLang();
  const { data, reload } = usePoll<{ categories: Category[] }>("/api/owner/menu", 0);
  const [catName, setCatName] = useState("");
  const [item, setItem] = useState({ ...BLANK_ITEM });
  const [mods, setMods] = useState<Modifier[]>([]);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [edit, setEdit] = useState<Partial<MenuItem>>({});
  const addFile = useRef<HTMLInputElement>(null);
  const editFile = useRef<HTMLInputElement>(null);

  async function addCategory() {
    if (!catName) return;
    await api("/api/owner/menu/categories", { method: "POST", body: JSON.stringify({ name: catName }) });
    setCatName("");
    reload();
  }
  async function deleteCategory(id: string) {
    if (!window.confirm("Delete this category?")) return;
    try {
      await api(`/api/owner/menu/categories/${id}`, { method: "DELETE" });
      reload();
    } catch (e) { alert((e as Error).message); }
  }

  async function pickAddImage(file?: File) {
    if (!file) return;
    setUploading(true);
    try { setItem((s) => ({ ...s, imageUrl: "" })); const url = await uploadImage(file); setItem((s) => ({ ...s, imageUrl: url })); }
    catch (e) { alert((e as Error).message); }
    finally { setUploading(false); }
  }

  async function addItem() {
    setBusy(true);
    try {
      await api("/api/owner/menu/items", {
        method: "POST",
        body: JSON.stringify({
          categoryId: item.categoryId,
          name: item.name,
          nameAm: item.nameAm || undefined,
          description: item.description || undefined,
          price: Number(item.price),
          cost: item.cost ? Number(item.cost) : 0,
          station: item.station,
          course: item.station === "BARISTA" ? "drink" : "main",
          imageUrl: item.imageUrl || undefined,
          modifiers: mods.filter((m) => m.groupName && m.option).map((m) => ({ groupName: m.groupName, option: m.option, extraPrice: Number(m.extraPrice) || 0 })),
        }),
      });
      setItem({ ...BLANK_ITEM });
      setMods([]);
      if (addFile.current) addFile.current.value = "";
      reload();
    } catch (e) { alert((e as Error).message); }
    finally { setBusy(false); }
  }

  function startEdit(it: MenuItem) {
    setEditId(it.id);
    setEdit({ name: it.name, nameAm: it.nameAm ?? "", price: it.price, cost: it.cost, station: it.station, imageUrl: it.imageUrl ?? "" });
  }
  async function pickEditImage(file?: File) {
    if (!file) return;
    setUploading(true);
    try { const url = await uploadImage(file); setEdit((e) => ({ ...e, imageUrl: url })); }
    catch (e) { alert((e as Error).message); }
    finally { setUploading(false); }
  }
  async function saveEdit() {
    if (!editId) return;
    setBusy(true);
    try {
      await api(`/api/owner/menu/items/${editId}`, {
        method: "PUT",
        body: JSON.stringify({
          name: edit.name,
          nameAm: (edit.nameAm as string) || undefined,
          price: Number(edit.price),
          cost: edit.cost != null && edit.cost !== "" ? Number(edit.cost) : undefined,
          station: edit.station,
          course: edit.station === "BARISTA" ? "drink" : "main",
          imageUrl: (edit.imageUrl as string) || null,
        }),
      });
      setEditId(null);
      reload();
    } catch (e) { alert((e as Error).message); }
    finally { setBusy(false); }
  }
  async function deleteItem(id: string) {
    if (!window.confirm("Delete this item?")) return;
    try { await api(`/api/owner/menu/items/${id}`, { method: "DELETE" }); reload(); }
    catch (e) { alert((e as Error).message); }
  }
  async function toggle(id: string) {
    await api(`/api/owner/menu/items/${id}`, { method: "PATCH" });
    reload();
  }
  async function publish() {
    await api("/api/owner/menu/publish", { method: "POST" });
    reload();
  }

  return (
    <div className="space-y-5">
      <PageHeader title={t("menuManagement")} subtitle="Add, edit, photograph and remove items. New items & edits go live on Publish.">
        <Button onClick={publish}>{t("publishDrafts")}</Button>
      </PageHeader>

      {/* New category */}
      <Card className="flex items-end gap-2">
        <div className="flex-1">
          <Field label={t("newCategoryLabel")}>
            <Input value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="e.g. Breakfast" />
          </Field>
        </div>
        <Button onClick={addCategory}>{t("addCategory")}</Button>
      </Card>

      {/* New item */}
      <Card className="space-y-3">
        <div className="font-medium">{t("addMenuItem")}</div>
        <div className="grid gap-2 md:grid-cols-3">
          <Select value={item.categoryId} onChange={(e) => setItem({ ...item, categoryId: e.target.value })}>
            <option value="">{t("selectCategory")}</option>
            {data?.categories.map((c) => <option key={c.id} value={c.id}>{tr(c.name, c.nameAm)}</option>)}
          </Select>
          <Input placeholder={t("nameEn")} value={item.name} onChange={(e) => setItem({ ...item, name: e.target.value })} />
          <Input placeholder={t("nameAmPlaceholder")} value={item.nameAm} onChange={(e) => setItem({ ...item, nameAm: e.target.value })} />
          <Input placeholder={t("priceEtb")} type="number" value={item.price} onChange={(e) => setItem({ ...item, price: e.target.value })} />
          <Input placeholder="Cost (ETB)" type="number" value={item.cost} onChange={(e) => setItem({ ...item, cost: e.target.value })} />
          <Select value={item.station} onChange={(e) => setItem({ ...item, station: e.target.value })}>
            <option value="KITCHEN">{t("kitchenFood")}</option>
            <option value="BARISTA">{t("baristaDrink")}</option>
          </Select>
        </div>
        <Input placeholder="Description (optional)" value={item.description} onChange={(e) => setItem({ ...item, description: e.target.value })} />

        {/* Photo */}
        <div className="flex items-center gap-3">
          {item.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.imageUrl} alt="" className="h-14 w-14 rounded-lg object-cover" />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-dashed border-brand-border text-brand-muted">🍽</div>
          )}
          <input ref={addFile} type="file" accept="image/*" className="hidden" onChange={(e) => pickAddImage(e.target.files?.[0])} />
          <Button variant="ghost" size="sm" onClick={() => addFile.current?.click()} loading={uploading}>
            {item.imageUrl ? "Change photo" : "Add photo"}
          </Button>
          {item.imageUrl && <Button variant="ghost" size="sm" onClick={() => setItem({ ...item, imageUrl: "" })}>Remove</Button>}
        </div>

        {/* Modifiers */}
        <div className="space-y-2 rounded-xl border border-brand-border/60 p-2">
          <div className="text-xs font-medium text-brand-muted">Options / modifiers (e.g. Size · Large · +20)</div>
          {mods.map((m, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_5rem_2rem] gap-1.5">
              <Input placeholder="Group" value={m.groupName} onChange={(e) => setMods((ms) => ms.map((x, idx) => idx === i ? { ...x, groupName: e.target.value } : x))} />
              <Input placeholder="Option" value={m.option} onChange={(e) => setMods((ms) => ms.map((x, idx) => idx === i ? { ...x, option: e.target.value } : x))} />
              <Input placeholder="+ETB" type="number" value={m.extraPrice} onChange={(e) => setMods((ms) => ms.map((x, idx) => idx === i ? { ...x, extraPrice: e.target.value } : x))} />
              <button onClick={() => setMods((ms) => ms.filter((_, idx) => idx !== i))} className="rounded-lg bg-brand-surface2 text-status-redText hover:bg-white/10">✕</button>
            </div>
          ))}
          <Button variant="ghost" size="sm" onClick={() => setMods((ms) => [...ms, { groupName: "", option: "", extraPrice: 0 }])}>+ Add option</Button>
        </div>

        <Button onClick={addItem} loading={busy} disabled={!item.categoryId || !item.name || !item.price}>{t("addItemBtn")}</Button>
      </Card>

      {/* Existing categories + items */}
      {data?.categories.map((c) => (
        <Card key={c.id}>
          <div className="mb-2 flex items-center justify-between">
            <span className="font-medium">{tr(c.name, c.nameAm)}</span>
            {c.items.length === 0 && (
              <button onClick={() => deleteCategory(c.id)} className="text-xs text-status-redText hover:underline">Delete category</button>
            )}
          </div>
          <div className="space-y-1 text-sm">
            {c.items.length === 0 && <EmptyState>{t("noItems")}</EmptyState>}
            {c.items.map((it) => (
              <div key={it.id} className="border-t border-brand-border/60 py-2 first:border-t-0">
                {editId === it.id ? (
                  <div className="space-y-2">
                    <div className="grid gap-1.5 md:grid-cols-2">
                      <Input value={(edit.name as string) ?? ""} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder={t("nameEn")} />
                      <Input value={(edit.nameAm as string) ?? ""} onChange={(e) => setEdit({ ...edit, nameAm: e.target.value })} placeholder={t("nameAmPlaceholder")} />
                      <Input type="number" value={(edit.price as string) ?? ""} onChange={(e) => setEdit({ ...edit, price: e.target.value })} placeholder={t("priceEtb")} />
                      <Input type="number" value={(edit.cost as string) ?? ""} onChange={(e) => setEdit({ ...edit, cost: e.target.value })} placeholder="Cost (ETB)" />
                      <Select value={(edit.station as string) ?? "KITCHEN"} onChange={(e) => setEdit({ ...edit, station: e.target.value })}>
                        <option value="KITCHEN">{t("kitchenFood")}</option>
                        <option value="BARISTA">{t("baristaDrink")}</option>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2">
                      {edit.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={edit.imageUrl as string} alt="" className="h-12 w-12 rounded-lg object-cover" />
                      ) : <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-dashed border-brand-border text-brand-muted">🍽</div>}
                      <input ref={editFile} type="file" accept="image/*" className="hidden" onChange={(e) => pickEditImage(e.target.files?.[0])} />
                      <Button variant="ghost" size="sm" onClick={() => editFile.current?.click()} loading={uploading}>Photo</Button>
                      <div className="flex-1" />
                      <Button size="sm" onClick={saveEdit} loading={busy}>Save</Button>
                      <Button variant="ghost" size="sm" onClick={() => setEditId(null)}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex flex-wrap items-center gap-x-1.5">
                      {it.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={it.imageUrl} alt="" className="mr-1 h-9 w-9 rounded-md object-cover" />
                      )}
                      {tr(it.name, it.nameAm)} {it.nameAm && <span className="text-brand-muted">/ {it.nameAm}</span>}
                      <span className="tabular text-brand-muted">· {Number(it.price).toLocaleString()} ETB</span>
                      <StatusChip status={it.state} />
                    </span>
                    <span className="flex shrink-0 items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => startEdit(it)}>Edit</Button>
                      <Button variant="ghost" size="sm" onClick={() => toggle(it.id)}>{it.available ? t("markUnavailable") : t("markAvailable")}</Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteItem(it.id)} className="text-status-redText">🗑</Button>
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
