"use client";
import useSWR from "swr";
import { useEffect, useMemo, useState } from "react";
import { useNextIcons } from "@/components/NI";

type Shortage = { id: string; productNameSystem: string; productNameActual?: string | null; countSystem: number; countActual: number; price: number; suggestedReplacement?: any; resolved: boolean; assignedToEmployeeId?: string | null };
type Category = { id: string; name: string; parentId?: string | null };
type Product = { id: string; name: string; price: number; stock?: number; category?: string | null; categoryId?: string | null; categoryRef?: Category | null };
type Employee = { id: string; name: string };

const fetcher = (u: string) => fetch(u).then((r) => r.json());

export default function ShortagesPage() {
  const NI = useNextIcons();
  const { data: shortages, mutate } = useSWR<Shortage[]>("/api/shortages", fetcher);
  const { data: products } = useSWR<Product[]>("/api/products", fetcher);
  const { data: categories } = useSWR<Category[]>("/api/categories", fetcher);
  const { data: employees } = useSWR<Employee[]>("/api/employees", fetcher);

  // Фильтры
  const [q, setQ] = useState("");
  const [activeCat, setActiveCat] = useState<string>("");
  const [activeSub, setActiveSub] = useState<string>("");
  const [status, setStatus] = useState<"all" | "shortage" | "surplus" | "normal">("all");

  const [counts, setCounts] = useState<Record<string, { system: string; actual: string; replacementId?: string }>>({});

  // Восстанавливаем введённые значения из localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem("shortagesCounts");
      if (raw) setCounts((prev) => ({ ...prev, ...JSON.parse(raw) }));
    } catch {}
  }, []);
  // Сохраняем при изменении
  useEffect(() => {
    try { localStorage.setItem("shortagesCounts", JSON.stringify(counts)); } catch {}
  }, [counts]);

  // При загрузке товаров заполняем "По системе" из импортированного остатка (stock)
  useEffect(() => {
    if (!products) return;
    setCounts((prev) => {
      const next = { ...prev } as Record<string, { system: string; actual: string; replacementId?: string }>;
      for (const p of products) {
        if (!next[p.id]) {
          next[p.id] = { system: String(p.stock ?? 0), actual: "" };
        } else if (next[p.id].system === "" || next[p.id].system === undefined) {
          next[p.id] = { ...next[p.id], system: String(p.stock ?? 0) };
        }
      }
      return next;
    });
  }, [products]);

  const subcats = useMemo(() => {
    const set = new Set<string>();
    (products ?? []).forEach(p => { if (p.category) set.add(p.category); });
    return Array.from(set);
  }, [products]);

  const rows = useMemo(() => {
    const list = products ?? [];
    const ql = q.trim().toLowerCase();
    return list.filter(p => {
      if (ql && !p.name.toLowerCase().includes(ql)) return false;
      if (activeCat && p.categoryRef?.id !== activeCat) return false;
      if (activeSub && (p.category ?? "") !== activeSub) return false;
      if (status !== "all") {
        const c = counts[p.id] ?? { system: "", actual: "" };
        const system = Number(c.system || 0);
        const actual = Number(c.actual || 0);
        const diff = actual - system;
        if (status === "shortage" && !(diff < 0)) return false;
        if (status === "surplus" && !(diff > 0)) return false;
        if (status === "normal" && !(diff === 0)) return false;
      }
      return true;
    });
  }, [products, q, activeCat, activeSub, status, counts]);

  // Подбор автозамены: ищем пары Недостача↔Избыток в одной подкатегории и по близкому названию
  const suggestions = useMemo(() => {
    if (!products) return {} as Record<string, string | undefined>;
    const diffs = new Map<string, number>();
    for (const p of products) {
      const c = counts[p.id];
      const system = Number(c?.system || 0);
      const actual = Number(c?.actual || 0);
      if (isNaN(system) || isNaN(actual)) continue;
      diffs.set(p.id, actual - system); // >0 избыток, <0 недостача
    }
    const surplus = products.filter((p) => (diffs.get(p.id) ?? 0) > 0);
    const shortage = products.filter((p) => (diffs.get(p.id) ?? 0) < 0);

    const scoreName = (a: string, b: string) => {
      const aa = a.toLowerCase();
      const bb = b.toLowerCase();
      if (aa === bb) return 3;
      if (aa.includes(bb) || bb.includes(aa)) return 2;
      const tokensA = aa.split(/[^a-zа-я0-9]+/i).filter(Boolean);
      const tokensB = bb.split(/[^a-zа-я0-9]+/i).filter(Boolean);
      const inter = tokensA.filter((t) => tokensB.includes(t)).length;
      return inter > 0 ? 1 : 0;
    };

    const pick: Record<string, string | undefined> = {};
    for (const s of shortage) {
      const sameCat = surplus.filter((x) => x.category && x.category === s.category);
      let best: { id: string; sc: number } | undefined;
      for (const c of sameCat) {
        const sc = scoreName(s.name, c.name);
        if (!best || sc > best.sc) best = { id: c.id, sc };
      }
      if (best && best.sc > 0) pick[s.id] = best.id;
    }
    return pick;
  }, [products, counts]);

  const totalValue = useMemo(() =>
    (products ?? []).reduce((acc, p) => {
      const c = counts[p.id];
      if (!c) return acc;
      const system = Number(c.system || 0);
      const actual = Number(c.actual || 0);
      const diff = system - actual;
      return diff > 0 ? acc + diff * Number(p.price) : acc;
    }, 0), [products, counts]);

  // Экспортируем общую сумму недостач в localStorage, чтобы страница зарплат могла её подхватить
  useEffect(() => {
    try { localStorage.setItem("shortagesTotal", String(totalValue || 0)); } catch {}
  }, [totalValue]);

  // Выбор сотрудников для деления суммы
  const [selectedEmp, setSelectedEmp] = useState<Record<string, boolean>>({});
  const selectedCount = useMemo(() => (employees ?? []).filter(e => selectedEmp[e.id]).length, [employees, selectedEmp]);
  const perEmployee = useMemo(() => selectedCount > 0 ? totalValue / selectedCount : 0, [totalValue, selectedCount]);

  const alignAll = () => {
    if (!products) return;
    setCounts((prev) => {
      const next = { ...prev } as Record<string, { system: string; actual: string; replacementId?: string }>;
      for (const p of products) {
        const cur = next[p.id] ?? { system: String(p.stock ?? 0), actual: "" };
        if (cur.actual === "" || cur.actual === undefined) {
          next[p.id] = { ...cur, actual: cur.system ?? String(p.stock ?? 0) };
        } else {
          next[p.id] = cur;
        }
      }
      return next;
    });
  };

  // Убрали сохранение в БД по просьбе пользователя

  return (
    <div className="space-y-4">
      <div className="card p-3 grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs text-gray-500">Поиск</label>
          <input value={q} onChange={(e)=>setQ(e.target.value)} className="border rounded px-2 py-1 w-full" placeholder="Название товара" />
        </div>
        <div>
          <label className="block text-xs text-gray-500">Категория</label>
          <select value={activeCat} onChange={(e)=>setActiveCat(e.target.value)} className="border rounded px-2 py-1 w-full">
            <option value="">Все</option>
            {(categories ?? []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500">Подкатегория</label>
          <select value={activeSub} onChange={(e)=>setActiveSub(e.target.value)} className="border rounded px-2 py-1 w-full">
            <option value="">Все</option>
            {subcats.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500">Статус</label>
          <select value={status} onChange={(e)=>setStatus(e.target.value as any)} className="border rounded px-2 py-1 w-full">
            <option value="all">Все</option>
            <option value="shortage">Недостача</option>
            <option value="surplus">Избыток</option>
            <option value="normal">Норма</option>
          </select>
        </div>
      </div>
      <div className="card p-3 flex items-center justify-between">
        <div className="text-sm text-gray-700">Заполните значения. Метки: <span title="Недостача">❗</span> <span title="Избыток">★</span> <span title="Норма">✔</span></div>
        <div className="flex items-center gap-2">
          <button className="rounded border px-3 py-2 flex items-center gap-1" onClick={alignAll}>{NI ? <NI.Refresh className="w-4 h-4" /> : "🔄"} Выровнять фактический</button>
        </div>
      </div>
      <div className="card overflow-x-auto mt-2">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left">
              <th className="p-2">Товар</th>
              <th className="p-2">Категория</th>
              <th className="p-2">Цена</th>
              <th className="p-2">По системе</th>
              <th className="p-2">Факт</th>
              <th className="p-2">Статус</th>
              <th className="p-2">Метка</th>
              <th className="p-2">Замена (та же категория)</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const c = counts[p.id] ?? { system: "", actual: "" };
              const system = Number(c.system || 0);
              const actual = Number(c.actual || 0);
              const diff = actual - system;
              const status = diff === 0 ? "Совпадает" : diff > 0 ? `Избыток +${diff}` : `Недостача ${diff}`;
              const marker = diff === 0 ? "✔" : diff > 0 ? "★" : "❗";
              const sameCategory = (products ?? []).filter((x) => x.category && x.category === p.category && x.id !== p.id);
              const suggestedId = suggestions[p.id];
              return (
                <tr key={p.id} className="border-t">
                  <td className="p-2 font-medium">{p.name}</td>
                  <td className="p-2">{p.category ?? "—"}</td>
                  <td className="p-2">{Number(p.price).toFixed(2)} ₽</td>
                  <td className="p-2"><input value={c.system} onChange={(e) => setCounts((m) => ({ ...m, [p.id]: { ...c, system: e.target.value } }))} className="border rounded px-2 py-1 w-24" /></td>
                  <td className="p-2"><input value={c.actual} onChange={(e) => setCounts((m) => ({ ...m, [p.id]: { ...c, actual: e.target.value } }))} className="border rounded px-2 py-1 w-24" /></td>
                  <td className="p-2">{status}</td>
                  <td className="p-2 text-lg">{marker}</td>
                  <td className="p-2">
                    {sameCategory.length > 0 ? (
                      <div className="flex items-center gap-2">
                        <select value={c.replacementId ?? ""} onChange={(e) => setCounts((m) => ({ ...m, [p.id]: { ...c, replacementId: e.target.value || undefined } }))} className="border rounded px-2 py-1">
                          <option value="">—</option>
                          {sameCategory.map((x) => (
                            <option key={x.id} value={x.id}>{x.name}</option>
                          ))}
                        </select>
                        {suggestedId && !c.replacementId ? (
                          <div className="flex items-center gap-1 text-xs">
                            <span className="text-gray-500">Предложение:</span>
                            <button className="px-2 py-1 rounded bg-emerald-600 text-white" onClick={() => setCounts((m) => ({ ...m, [p.id]: { ...c, replacementId: suggestedId } }))}>Да</button>
                            <button className="px-2 py-1 rounded border" onClick={() => setCounts((m) => ({ ...m, [p.id]: { ...c, replacementId: undefined } }))}>Нет</button>
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-500">Нет вариантов</span>
                    )}
                  </td>
                  <td className="p-2 text-right"></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="text-sm text-gray-700">
          <div>Сумма недостач: <span className="font-medium">{totalValue.toFixed(2)} ₽</span></div>
          <div className="mt-1">Делится на: <span className="font-medium">{selectedCount}</span> — по <span className="font-medium">{perEmployee.toFixed(2)} ₽</span> на человека</div>
        </div>
        <button className="btn-primary flex items-center gap-1" onClick={() => {
          const rows = (shortages ?? []).map((s) => ({
            Товар: s.productNameSystem,
            "Факт": s.countActual,
            "Система": s.countSystem,
            Цена: Number(s.price).toFixed(2),
            Замена: (s as any).suggestedReplacement?.name ?? s.productNameActual ?? "",
            Статус: s.resolved ? "Закрыто" : "Открыто",
          }));
          const headers = Object.keys(rows[0] ?? { Товар: "", Факт: "", Система: "", Цена: "", Замена: "", Статус: "" });
          const csv = [headers.join(";"), ...rows.map((r) => headers.map((h) => String((r as any)[h]).replaceAll(";", ",")).join(";"))].join("\n");
          const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `nedostachi-${new Date().toISOString().slice(0,10)}.csv`;
          a.click();
          URL.revokeObjectURL(url);
        }}>{NI ? <NI.Download className="w-4 h-4" /> : "⬇️"} Экспорт CSV</button>
      </div>

      <div className="card p-3">
        <div className="font-medium mb-2">Кто участвует в делении</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {(employees ?? []).map(e => (
            <label key={e.id} className="flex items-center gap-2">
              <input type="checkbox" checked={!!selectedEmp[e.id]} onChange={(ev)=> setSelectedEmp(s => ({ ...s, [e.id]: ev.target.checked }))} />
              <span>{e.name}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="card overflow-x-auto mt-2">
        <table className="min-w-full text-sm">
          <thead><tr className="bg-gray-50 text-left"><th className="p-2">Запись</th><th className="p-2">Факт/Система</th><th className="p-2">Цена</th><th className="p-2">Остаток (импорт)</th><th className="p-2">Замена</th><th className="p-2">Статус</th><th className="p-2"></th></tr></thead>
          <tbody>
            {(shortages ?? []).map((s) => (
              <tr key={s.id} className="border-t">
                <td className="p-2">{s.productNameSystem}</td>
                <td className="p-2">{s.countActual}/{s.countSystem}</td>
                <td className="p-2">{Number(s.price).toFixed(2)}</td>
                <td className="p-2">{(products ?? []).find(p => p.name === s.productNameSystem)?.stock ?? 0}</td>
                <td className="p-2">{s.productNameActual ?? (s.suggestedReplacement?.name ?? "—")}</td>
                <td className="p-2">{s.resolved ? "Закрыто" : "Открыто"}</td>
                <td className="p-2 text-right"><button className="text-blue-600 mr-2" onClick={async () => { await fetch(`/api/shortages/${s.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resolved: !s.resolved }) }); mutate(); }}>Переключить</button><button className="text-red-600" onClick={async () => { await fetch(`/api/shortages/${s.id}`, { method: "DELETE" }); mutate(); }}>Удалить</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="text-right text-sm text-gray-700">Сумма недостач: <span className="font-medium">{totalValue.toFixed(2)} ₽</span></div>
    </div>
  );
}


