"use client";
import useSWR from "swr";
import { useNextIcons } from "@/components/NI";
import { useMemo, useState } from "react";

type Category = { id: string; name: string; parentId?: string | null };
type Product = { id: string; name: string; price: number; stock?: number; lastImportedAt?: string | null; category?: string | null; categoryId?: string | null; categoryRef?: Category | null };
const fetcher = (u: string) => fetch(u).then((r) => r.json());

export default function ProductsPage() {
  const NI = useNextIcons();
  const [activeCat, setActiveCat] = useState<string>("");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ by: "name" | "price"; dir: "asc" | "desc" }>({ by: "name", dir: "asc" });
  const { data, mutate } = useSWR<Product[]>(`/api/products?categoryId=${encodeURIComponent(activeCat)}&q=${encodeURIComponent(q)}&sort=${sort.by}&dir=${sort.dir}`, fetcher);
  const { data: categories, mutate: mutateCats } = useSWR<Category[]>("/api/categories", fetcher);
  const { data: tags, mutate: mutateTags } = useSWR<string[]>("/api/products/categories", fetcher);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [categoryIdNew, setCategoryIdNew] = useState<string>("");
  const [files, setFiles] = useState<File[]>([]);
  const [showBulk, setShowBulk] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [showCats, setShowCats] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatParent, setNewCatParent] = useState<string>("");
  const [rows, setRows] = useState<Array<{ name: string; price: string; categoryId?: string; sub: string }>>([
    { name: "", price: "", sub: "", categoryId: "" },
  ]);
  const canSaveBulk = useMemo(() => rows.some(r => r.name.trim() && !Number.isNaN(Number((r.price||"").replace(",",".")))), [rows]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [bulkSub, setBulkSub] = useState("");

  const add = async () => {
    await fetch("/api/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, price: Number(price), category: subcategory || undefined, categoryId: categoryIdNew || undefined }) });
    setName(""); setPrice(""); setSubcategory(""); setCategoryIdNew("");
    mutate();
  };

  const importXlsx = async () => {
    if (!files.length) return;
    const fd = new FormData();
    for (const f of files) fd.append("file", f);
    const res = await fetch("/api/products/import", { method: "POST", body: fd });
    if (!res.ok) { alert(await res.text()); return; }
    const j = await res.json();
    alert(`Импорт завершён. Добавлено: ${j.created}, обновлено: ${j.updated}.`);
    setFiles([]);
    mutate();
  };

  return (
    <div className="space-y-4">
      <div className="card p-3 flex flex-wrap items-center gap-2">
        <button onClick={() => setActiveCat("")} className={`px-3 py-1 rounded ${activeCat === "" ? "bg-blue-600 text-white" : "bg-gray-100"}`}>Все</button>
        {(categories ?? []).map((c) => (
          <button key={c.id} onClick={() => setActiveCat(c.id)} className={`px-3 py-1 rounded ${activeCat === c.id ? "bg-blue-600 text-white" : "bg-gray-100"}`}>{c.name}</button>
        ))}
        <div className="ml-auto flex items-end gap-2">
          <div>
            <label className="block text-xs text-gray-500">Поиск</label>
            <input value={q} onChange={(e) => setQ(e.target.value)} className="border rounded px-2 py-1" placeholder="Название" />
          </div>
          <div>
            <label className="block text-xs text-gray-500">Сортировка</label>
            <select value={`${sort.by}:${sort.dir}`} onChange={(e) => { const [by, dir] = e.target.value.split(":"); setSort({ by: by as any, dir: dir as any }); }} className="border rounded px-2 py-1">
              <option value="name:asc">Имя ↑</option>
              <option value="name:desc">Имя ↓</option>
              <option value="price:asc">Цена ↑</option>
              <option value="price:desc">Цена ↓</option>
            </select>
          </div>
        </div>
      </div>
      <div className="card p-3 flex items-end gap-2">
        <div className="flex-1">
          <label className="block text-xs text-gray-500">Импорт из Excel (.xlsx)</label>
          <input type="file" accept=".xlsx,.xls" multiple onChange={(e) => setFiles(Array.from(e.target.files ?? []))} />
        </div>
        <button disabled={!files.length} className="btn-primary px-3 py-2 disabled:opacity-60 flex items-center gap-1" onClick={importXlsx}>{NI ? <NI.Upload className="w-4 h-4" /> : "⬆️"} Импортировать {files.length ? `(${files.length})` : ""}</button>
        <button className="btn-ghost flex items-center gap-1" onClick={() => setShowCats(true)}>{NI ? <NI.Tag className="w-4 h-4" /> : "🏷️"} Категории…</button>
      </div>
      <div className="grid grid-cols-4 gap-2">
        <input placeholder="Наименование" value={name} onChange={(e) => setName(e.target.value)} className="border rounded px-2 py-1" />
        <input placeholder="Цена" value={price} onChange={(e) => setPrice(e.target.value)} className="border rounded px-2 py-1" />
        <select value={categoryIdNew} onChange={(e) => setCategoryIdNew(e.target.value)} className="border rounded px-2 py-1">
          <option value="">Категория (основная)</option>
          {(categories ?? []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <div className="flex gap-2">
          <input placeholder="Подкатегория (тег)" value={subcategory} onChange={(e) => setSubcategory(e.target.value)} className="border rounded px-2 py-1 flex-1" />
          <button className="btn-primary px-3" onClick={add}>Добавить</button>
          <button className="btn-ghost flex items-center gap-1" onClick={() => setShowBulk(true)}>{NI ? <NI.Rows className="w-4 h-4" /> : "📋"} Массово…</button>
        </div>
      </div>
      <div className="card p-3 mb-2 flex items-end gap-2">
        <div className="flex items-center gap-2">
          <input value={bulkSub} onChange={(e)=>setBulkSub(e.target.value)} className="border rounded px-2 py-1" placeholder="Подкатегория для выбранных" />
          <button className="btn-primary px-3 py-2" onClick={async ()=>{
            const ids = Object.keys(selected).filter(k=>selected[k]);
            if (!ids.length) { alert('Выберите товары'); return; }
            const res = await fetch('/api/products/bulk-subcategory', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ ids, category: bulkSub }) });
            if (!res.ok) alert(await res.text());
            setBulkSub(''); setSelected({}); mutate();
          }}>Применить</button>
          <button className="rounded border px-3 py-2" onClick={async ()=>{
            const ids = Object.keys(selected).filter(k=>selected[k]);
            if (!ids.length) { alert('Выберите товары'); return; }
            if (!confirm(`Удалить ${ids.length} товаров?`)) return;
            const res = await fetch('/api/products/bulk-delete', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ ids }) });
            if (!res.ok) alert(await res.text());
            setSelected({}); mutate();
          }}>Удалить выбранные</button>
        </div>
      </div>
      <div className="card overflow-x-auto">
        <table className="min-w-full text-sm">
           <thead><tr className="bg-gray-50 text-left"><th className="p-2"><input type="checkbox" onChange={(e)=>{
            const checked = e.target.checked; const map: any = {}; (data??[]).forEach(p=> map[p.id]=checked); setSelected(map);
           }} /></th><th className="p-2">Наименование</th><th className="p-2">Цена</th><th className="p-2">Остаток</th><th className="p-2">Импорт (МСК)</th><th className="p-2">Категория</th><th className="p-2">Подкатегория</th><th className="p-2"></th></tr></thead>
          <tbody>
            {(data ?? []).map((p) => (
              <tr key={p.id} className="border-t">
                <td className="p-2"><input type="checkbox" checked={!!selected[p.id]} onChange={(e)=> setSelected(s=> ({ ...s, [p.id]: e.target.checked }))} /></td>
                <td className="p-2">{p.name}</td>
                <td className="p-2">{Number(p.price).toFixed(2)}</td>
                 <td className="p-2">{p.stock ?? 0}</td>
                 <td className="p-2">{p.lastImportedAt ? new Date(p.lastImportedAt).toLocaleString("ru-RU", { timeZone: "Europe/Moscow" }) : "—"}</td>
                 <td className="p-2">{p.categoryRef?.name ?? ""}</td>
                 <td className="p-2">
                   <InlineSubEditor value={p.category ?? ""} onSave={async (v) => {
                     const res = await fetch(`/api/products/${p.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ category: v }) });
                     if (!res.ok) alert(await res.text());
                     mutate();
                   }} />
                 </td>
                 <td className="p-2 text-right flex gap-3 justify-end">
                  <button className="text-red-600 flex items-center gap-1" onClick={async () => {
                     const newName = prompt("Название", p.name);
                     if (newName == null) return;
                     const newPriceStr = prompt("Цена", String(p.price));
                     if (newPriceStr == null) return;
                     const body: any = { name: newName, price: Number(newPriceStr) };
                     const res = await fetch(`/api/products/${p.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
                     if (!res.ok) alert(await res.text());
                     mutate();
                  }}>{NI ? <NI.Edit className="w-4 h-4" /> : "✏️"} Изменить</button>
                  <button className="text-red-700 flex items-center gap-1" onClick={async () => { const res = await fetch(`/api/products/${p.id}`, { method: "DELETE" }); if (!res.ok) { const t = await res.text(); alert(t || "Не удалось удалить товар"); } else { mutate(); } }}>{NI ? <NI.Trash className="w-4 h-4" /> : "🗑️"} Удалить</button>
                 </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showBulk && (
        <div className="fixed inset-0 modal-backdrop z-50 flex items-center justify-center p-4" onClick={() => setShowBulk(false)}>
          <div className="modal-panel max-w-4xl w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4"><div className="text-lg font-semibold">Массовое добавление</div><button onClick={() => setShowBulk(false)}>×</button></div>
            <div className="mb-3">
              <label className="block text-xs text-gray-500 mb-1">Категория по умолчанию</label>
              <select value={categoryIdNew} onChange={(e) => setCategoryIdNew(e.target.value)} className="border rounded px-2 py-2">
                <option value="">— Не задавать —</option>
                {(categories ?? []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              {rows.map((r, i) => (
                <div key={i} className="grid grid-cols-4 gap-2 items-center">
                  <input placeholder="Название" value={r.name} onChange={(e) => setRows(rs => rs.map((x,idx)=> idx===i? { ...x, name: e.target.value }: x))} className="border rounded px-2 py-2" />
                  <input placeholder="Цена" value={r.price} onChange={(e) => setRows(rs => rs.map((x,idx)=> idx===i? { ...x, price: e.target.value }: x))} className="border rounded px-2 py-2" />
                  <select value={r.categoryId || categoryIdNew} onChange={(e) => setRows(rs => rs.map((x,idx)=> idx===i? { ...x, categoryId: e.target.value }: x))} className="border rounded px-2 py-2">
                    <option value="">(как по умолчанию)</option>
                    {(categories ?? []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <div className="flex gap-2">
                    <input placeholder="Подкатегория" value={r.sub} onChange={(e) => setRows(rs => rs.map((x,idx)=> idx===i? { ...x, sub: e.target.value }: x))} className="border rounded px-2 py-2 flex-1" />
                    <button className="rounded border px-3" onClick={() => setRows(rs => rs.filter((_,idx)=> idx!==i))}>−</button>
                  </div>
                </div>
              ))}
              <div className="pt-2">
                <button className="btn-primary px-3 py-2" onClick={() => setRows(rs => [...rs, { name: "", price: "", sub: "", categoryId: categoryIdNew }])}>Добавить строку</button>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setShowBulk(false)}>Отмена</button>
              <button disabled={!canSaveBulk} className="btn-primary px-3 py-2 disabled:opacity-60" onClick={async () => {
                const items = rows
                  .map(r => ({ name: r.name.trim(), price: Number((r.price||"").replace(",",".")), subcategory: r.sub?.trim(), categoryId: r.categoryId || categoryIdNew || undefined }))
                  .filter(it => it.name && !Number.isNaN(it.price));
                if (!items.length) { alert("Нет валидных строк"); return; }
                const res = await fetch('/api/products/bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items }) });
                if (!res.ok) { alert(await res.text()); return; }
                setShowBulk(false); setRows([{ name: "", price: "", sub: "", categoryId: categoryIdNew }]); mutate();
              }}>Сохранить</button>
            </div>
          </div>
        </div>
      )}

      {showCats && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowCats(false)}>
          <div className="bg-white rounded shadow max-w-xl w-full p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2"><div className="font-semibold">Категории</div><button onClick={() => setShowCats(false)}>×</button></div>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <input placeholder="Название категории" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} className="border rounded px-2 py-1" />
              <select value={newCatParent} onChange={(e) => setNewCatParent(e.target.value)} className="border rounded px-2 py-1">
                <option value="">Без родителя</option>
                {(categories ?? []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="flex justify-end gap-2 mb-4">
              <button className="rounded bg-blue-600 text-white px-3 py-2 hover:bg-blue-700" onClick={async () => {
                if (!newCatName.trim()) return;
                await fetch('/api/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newCatName.trim(), parentId: newCatParent || undefined }) });
                setNewCatName(''); setNewCatParent('');
                // refresh categories by revalidating SWR
                // simply change state to trigger re-fetch
                setActiveCat('');
              }}>Добавить категорию</button>
            </div>
            <div className="max-h-60 overflow-auto border rounded mb-4">
              <table className="min-w-full text-sm">
                <thead><tr className="bg-gray-50 text-left"><th className="p-2">Категория</th><th className="p-2">Родитель</th><th className="p-2"></th></tr></thead>
                <tbody>
                {(categories ?? []).map(c => (
                  <tr key={c.id} className="border-t"><td className="p-2">{c.name}</td><td className="p-2">{(categories ?? []).find(x=>x.id===c.parentId)?.name ?? '—'}</td><td className="p-2 text-right"><button className="text-red-600" onClick={async () => { await fetch(`/api/categories/${c.id}`, { method: 'DELETE' }); mutateCats(); }}>Удалить</button></td></tr>
                ))}
                </tbody>
              </table>
            </div>
            <div className="max-h-60 overflow-auto border rounded">
              <table className="min-w-full text-sm">
                <thead><tr className="bg-gray-50 text-left"><th className="p-2">Подкатегория (тег)</th><th className="p-2"></th></tr></thead>
                <tbody>
                {(tags ?? []).map(t => (
                  <tr key={t} className="border-t"><td className="p-2">{t}</td><td className="p-2 text-right"><button className="text-red-600" onClick={async () => { await fetch(`/api/subcategories/${encodeURIComponent(t)}`, { method: 'DELETE' }); mutateTags(); }}>Удалить</button></td></tr>
                ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InlineSubEditor({ value, onSave }: { value: string; onSave: (v: string) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);
  return (
    <div>
      {!editing ? (
        <div className="inline-flex items-center gap-2">
          <span className="px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs">{value || "—"}</span>
          <button className="text-red-600" onClick={() => { setVal(value); setEditing(true); }}>✎</button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <input value={val} onChange={(e) => setVal(e.target.value)} className="border rounded px-2 py-1" placeholder="Подкатегория" />
          <button className="btn-primary px-2 py-1" onClick={async () => { await onSave(val.trim()); setEditing(false); }}>Сохранить</button>
          <button className="rounded border px-2 py-1" onClick={() => setEditing(false)}>Отмена</button>
        </div>
      )}
    </div>
  );
}


