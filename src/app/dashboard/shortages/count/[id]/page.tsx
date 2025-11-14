"use client";
import useSWR from "swr";
import { useEffect, useMemo, useState, useRef } from "react";
import { useNextIcons } from "@/components/NI";
import { useSuccess } from "@/components/SuccessProvider";
import { useRouter } from "next/navigation";
import DraggableCalculator from "@/components/DraggableCalculator";

type Category = { id: string; name: string; parentId?: string | null };
type Product = { id: string; name: string; price: number; stock?: number; category?: string | null; subcategory?: string | null; categoryId?: string | null; categoryRef?: Category | null };
type Employee = { id: string; name: string };
type InventoryCount = { id: string; name: string; date: string; data: any; status: string; createdAt: string; updatedAt: string };

const fetcher = (u: string) => fetch(u).then((r) => r.json());

export default function CountDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState("");
  useEffect(() => { params.then((p) => setId(p.id)); }, [params]);
  
  const NI = useNextIcons();
  const router = useRouter();
  const { showSuccess } = useSuccess();
  const { data: products } = useSWR<Product[]>("/api/products", fetcher);
  const { data: categories } = useSWR<Category[]>("/api/categories", fetcher);
  const { data: employees } = useSWR<Employee[]>("/api/employees", fetcher);
  const { data: savedCounts, mutate: mutateCounts } = useSWR<InventoryCount[]>("/api/inventory-counts", fetcher);

  const currentCount = useMemo(() => savedCounts?.find(c => c.id === id), [savedCounts, id]);
  
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [calcValue, setCalcValue] = useState("0");
  const activeInputRef = useRef<HTMLInputElement | null>(null);
  
  const [q, setQ] = useState("");
  const [activeCat, setActiveCat] = useState<string>("");
  const [activeSub, setActiveSub] = useState<string>("");
  const [status, setStatus] = useState<"all" | "shortage" | "surplus" | "normal">("all");
  const [activeTab, setActiveTab] = useState<"all" | "replacements" | "plus" | "minus">("all");
  
  const [counts, setCounts] = useState<Record<string, { system: string; actual: string; replacementId?: string }>>({});
  const [countDate, setCountDate] = useState(new Date().toISOString().slice(0, 10));

  const subcats = useMemo(() => {
    const set = new Set<string>();
    (products ?? []).forEach(p => { if (p.category) set.add(p.category); });
    return Array.from(set);
  }, [products]);

  const replacements = useMemo(() => {
    const list: Array<{ from: Product; to: Product; count: number }> = [];
    if (!products) return list;
    for (const p of products) {
      const c = counts[p.id];
      if (!c?.replacementId) continue;
      const toProduct = products.find(x => x.id === c.replacementId);
      if (!toProduct) continue;
      list.push({ from: p, to: toProduct, count: 1 });
    }
    return list;
  }, [products, counts]);

  const plusProducts = useMemo(() => {
    if (!products) return [];
    return products.filter(p => {
      const c = counts[p.id];
      if (!c) return false;
      const system = Number(c.system || 0);
      const actual = Number(c.actual || 0);
      const diff = actual - system;
      return diff > 0 && !c.replacementId;
    });
  }, [products, counts]);

  const minusProducts = useMemo(() => {
    if (!products) return [];
    return products.filter(p => {
      const c = counts[p.id];
      if (!c) return false;
      const system = Number(c.system || 0);
      const actual = Number(c.actual || 0);
      const diff = actual - system;
      return diff < 0 && !c.replacementId;
    });
  }, [products, counts]);

  const allRows = useMemo(() => {
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

  const rows = useMemo(() => {
    if (activeTab === "replacements") {
      const replacementIds = new Set(replacements.map(r => r.from.id));
      return allRows.filter(p => replacementIds.has(p.id));
    } else if (activeTab === "plus") {
      return plusProducts;
    } else if (activeTab === "minus") {
      return minusProducts;
    }
    return allRows;
  }, [allRows, activeTab, replacements, plusProducts, minusProducts]);

  const suggestions = useMemo(() => {
    if (!products) return {} as Record<string, string | undefined>;
    const diffs = new Map<string, number>();
    const usedSurplus = new Map<string, number>();
    
    for (const p of products) {
      const c = counts[p.id];
      const system = Number(c?.system || 0);
      const actual = Number(c?.actual || 0);
      if (isNaN(system) || isNaN(actual)) continue;
      diffs.set(p.id, actual - system);
      usedSurplus.set(p.id, Math.max(0, actual - system));
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
      let best: { id: string; sc: number; available: number } | undefined;
      for (const c of sameCat) {
        const available = usedSurplus.get(c.id) ?? 0;
        if (available <= 0) continue;
        const sc = scoreName(s.name, c.name);
        if (!best || sc > best.sc || (sc === best.sc && available > best.available)) {
          best = { id: c.id, sc, available };
        }
      }
      if (best && best.sc > 0) {
        pick[s.id] = best.id;
        usedSurplus.set(best.id, Math.max(0, (usedSurplus.get(best.id) ?? 0) - 1));
      }
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
      // Исключаем замененные товары из недостач
      if (diff > 0 && !c.replacementId) {
        return acc + diff * Number(p.price);
      }
      return acc;
    }, 0), [products, counts]);

  useEffect(() => {
    try { localStorage.setItem("shortagesTotal", String(totalValue || 0)); } catch {}
  }, [totalValue]);

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

  // Обработчик изменения значения калькулятора - вставляем в активное поле
  const handleCalcValueChange = (value: string) => {
    setCalcValue(value);
    if (activeInputRef.current) {
      const input = activeInputRef.current;
      const numValue = value.replace(",", ".");
      
      // Получаем productId из data-product-id атрибута или из ближайшего контекста
      const productId = input.getAttribute("data-product-id");
      const fieldType = input.getAttribute("data-field-type"); // "system" или "actual"
      
      if (productId && fieldType) {
        // Обновляем состояние напрямую
        setCounts((m) => {
          const c = m[productId] ?? { system: "", actual: "" };
          return {
            ...m,
            [productId]: {
              ...c,
              [fieldType]: numValue,
            },
          };
        });
      } else {
        // Fallback: обновляем через события
        input.value = numValue;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }
  };

  // Обработчик фокуса на поле ввода - сохраняем ссылку для вставки значения
  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>, productId: string, fieldType: "system" | "actual") => {
    activeInputRef.current = e.target;
    e.target.setAttribute("data-product-id", productId);
    e.target.setAttribute("data-field-type", fieldType);
  };

  const saveProduct = async (productId: string) => {
    if (!id) return;
    try {
      const res = await fetch(`/api/inventory-counts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: counts,
          date: countDate,
        }),
      });
      if (!res.ok) throw new Error("Ошибка при сохранении");
      mutateCounts();
      showSuccess("Сохранено!");
    } catch (error) {
      alert("Ошибка при сохранении");
    }
  };

  const saveCurrentCount = async () => {
    if (!id) return;
    try {
      // Обновляем counts с данными о недостачах для зарплат
      const countsWithShortageData = {
        ...counts,
        __shortageTotalValue: totalValue,
      };
      
      const res = await fetch(`/api/inventory-counts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: countsWithShortageData,
          date: countDate,
          status: "SAVED",
        }),
      });
      if (!res.ok) throw new Error("Ошибка при сохранении");
      showSuccess("Пересчет сохранен!");
      mutateCounts();
    } catch (error) {
      alert("Ошибка при сохранении пересчета");
    }
  };

  useEffect(() => {
    if (currentCount && currentCount.data) {
      // Убираем служебное поле __shortageTotalValue из counts при загрузке
      const { __shortageTotalValue, ...cleanCounts } = currentCount.data as any;
      setCounts(cleanCounts);
      setCountDate(new Date(currentCount.date).toISOString().slice(0, 10));
    }
  }, [currentCount]);

  // Автоматическая синхронизация остатков с Langame в реальном времени
  useEffect(() => {
    // Синхронизируем только если пересчет в статусе DRAFT (активный)
    if (!id || !currentCount || currentCount.status !== "DRAFT") {
      return;
    }

    console.log("[CountPage] Starting automatic stock sync");
    
    // Функция синхронизации остатков
    const syncStock = async () => {
      try {
        const res = await fetch("/api/langame/sync-stock", {
          method: "POST",
        });
        
        if (res.ok) {
          const result = await res.json();
          console.log("[CountPage] Stock sync completed:", result);
          
          // Если были обновлены остатки, обновляем данные пересчета
          if (result.updatedCounts > 0) {
            // Перезагружаем данные пересчета
            mutateCounts();
            // Обновляем список товаров
            if (products) {
              // Перезагружаем товары через SWR
              const productsRes = await fetch("/api/products");
              if (productsRes.ok) {
                const updatedProducts = await productsRes.json();
                // Обновляем counts с новыми остатками
                setCounts((prev) => {
                  const updated = { ...prev };
                  for (const product of updatedProducts) {
                    if (updated[product.id]) {
                      updated[product.id] = {
                        ...updated[product.id],
                        system: String(product.stock ?? 0),
                      };
                    }
                  }
                  return updated;
                });
              }
            }
          }
        } else {
          console.error("[CountPage] Stock sync failed:", res.status);
        }
      } catch (error) {
        console.error("[CountPage] Stock sync error:", error);
      }
    };

    // Первая синхронизация сразу
    syncStock();

    // Затем синхронизируем каждые 30 секунд
    const interval = setInterval(syncStock, 30000);

    return () => {
      clearInterval(interval);
    };
  }, [id, currentCount, mutateCounts, products]);

  if (!id || !currentCount) {
    return <div className="card p-4 text-white">Загрузка...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="card p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 sm:gap-3 flex-1">
          <button onClick={() => router.push("/dashboard/shortages")} className="text-white hover:text-red-400 text-sm sm:text-base">
            ← Назад
          </button>
          <h1 className="text-lg sm:text-xl font-bold text-white truncate">{currentCount.name}</h1>
          <button 
            onClick={() => setCalculatorOpen(!calculatorOpen)}
            className="p-2 rounded bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 transition-all flex-shrink-0"
            title="Калькулятор"
          >
            {NI ? <NI.Calculator className="w-5 h-5 text-white" /> : "🔢"}
          </button>
          {calculatorOpen && (
            <DraggableCalculator 
              onValueChange={handleCalcValueChange}
              initialValue={calcValue}
              onClose={() => setCalculatorOpen(false)}
            />
          )}
        </div>
        <button onClick={saveCurrentCount} className="btn-primary flex items-center gap-1 text-sm sm:text-base w-full sm:w-auto justify-center">
          {NI ? <NI.Save className="w-4 h-4" /> : "💾"} Сохранить изменения
        </button>
      </div>


      <div className="card p-3 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setActiveCat("")} className={`px-3 py-1 rounded transition-all text-sm ${activeCat === "" ? "bg-gradient-to-r from-red-500 to-red-600 text-white shadow-[0_0_12px_rgba(255,0,0,0.3)]" : "bg-gray-900/50 text-gray-300 border border-gray-700 hover:border-red-500/50 hover:bg-red-500/10"}`}>Все</button>
          {(categories ?? []).map((c) => (
            <button key={c.id} onClick={() => setActiveCat(c.id)} className={`px-3 py-1 rounded transition-all text-sm ${activeCat === c.id ? "bg-gradient-to-r from-red-500 to-red-600 text-white shadow-[0_0_12px_rgba(255,0,0,0.3)]" : "bg-gray-900/50 text-gray-300 border border-gray-700 hover:border-red-500/50 hover:bg-red-500/10"}`}>{c.name}</button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex-1 min-w-[150px]">
            <label className="block text-xs mb-1" style={{ color: "rgba(255, 255, 255, 0.7)" }}>Поиск</label>
            <input value={q} onChange={(e)=>setQ(e.target.value)} className="border rounded px-2 py-1 w-full" placeholder="Название" />
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="block text-xs mb-1" style={{ color: "rgba(255, 255, 255, 0.7)" }}>Подкатегория</label>
            <select value={activeSub} onChange={(e)=>setActiveSub(e.target.value)} className="border rounded px-2 py-1 w-full">
              <option value="">Все</option>
              {subcats.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="block text-xs mb-1" style={{ color: "rgba(255, 255, 255, 0.7)" }}>Статус</label>
            <select value={status} onChange={(e)=>setStatus(e.target.value as any)} className="border rounded px-2 py-1 w-full">
              <option value="all">Все</option>
              <option value="shortage">Недостача</option>
              <option value="surplus">Избыток</option>
              <option value="normal">Норма</option>
            </select>
          </div>
        </div>
      </div>
      
      <div className="card p-3 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={() => setActiveTab("all")} 
            className={`px-3 py-1 rounded transition-all text-sm ${activeTab === "all" ? "bg-gradient-to-r from-red-500 to-red-600 text-white shadow-[0_0_12px_rgba(255,0,0,0.3)]" : "bg-gray-900/50 text-gray-300 border border-gray-700 hover:border-red-500/50 hover:bg-red-500/10"}`}
          >
            Все
          </button>
          <button 
            onClick={() => setActiveTab("replacements")} 
            className={`px-3 py-1 rounded transition-all text-sm ${activeTab === "replacements" ? "bg-gradient-to-r from-red-500 to-red-600 text-white shadow-[0_0_12px_rgba(255,0,0,0.3)]" : "bg-gray-900/50 text-gray-300 border border-gray-700 hover:border-red-500/50 hover:bg-red-500/10"}`}
          >
            Замены ({replacements.length})
          </button>
          <button 
            onClick={() => setActiveTab("plus")} 
            className={`px-3 py-1 rounded transition-all text-sm ${activeTab === "plus" ? "bg-gradient-to-r from-red-500 to-red-600 text-white shadow-[0_0_12px_rgba(255,0,0,0.3)]" : "bg-gray-900/50 text-gray-300 border border-gray-700 hover:border-red-500/50 hover:bg-red-500/10"}`}
          >
            Плюсы ({plusProducts.length})
          </button>
          <button 
            onClick={() => setActiveTab("minus")} 
            className={`px-3 py-1 rounded transition-all text-sm ${activeTab === "minus" ? "bg-gradient-to-r from-red-500 to-red-600 text-white shadow-[0_0_12px_rgba(255,0,0,0.3)]" : "bg-gray-900/50 text-gray-300 border border-gray-700 hover:border-red-500/50 hover:bg-red-500/10"}`}
          >
            Минусы ({minusProducts.length})
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input 
            type="date" 
            value={countDate} 
            onChange={(e) => setCountDate(e.target.value)} 
            className="border rounded px-2 py-1 bg-gray-900 text-white border-gray-700 flex-1 min-w-[150px]"
          />
          <button className="rounded border px-3 py-2 flex items-center gap-1 bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 border-red-500 transition-all text-sm" onClick={alignAll}>{NI ? <NI.Refresh className="w-4 h-4" /> : "↻"} Выровнять</button>
        </div>
      </div>

      <div className="card overflow-x-auto mt-2">
        <table className="min-w-full text-sm">
          <thead className="hidden lg:table-header-group">
            <tr className="text-left border-b" style={{ borderColor: "rgba(255, 0, 0, 0.2)" }}>
              <th className="p-3 text-white font-semibold">Товар</th>
              <th className="p-3 text-white font-semibold">Категория</th>
              <th className="p-3 text-white font-semibold">Подкатегория</th>
              <th className="p-3 text-white font-semibold">Цена</th>
              <th className="p-3 text-white font-semibold">Остаток</th>
              <th className="p-3 text-white font-semibold">По системе</th>
              <th className="p-3 text-white font-semibold">Факт</th>
              <th className="p-3 text-white font-semibold">Статус</th>
              <th className="p-3 text-white font-semibold">Метка</th>
              <th className="p-3 text-white font-semibold">Замена</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const c = counts[p.id] ?? { system: "", actual: "" };
              const system = Number(c.system || 0);
              const actual = Number(c.actual || 0);
              const diff = actual - system;
              const statusStr = diff === 0 ? "Совпадает" : diff > 0 ? `Избыток +${diff}` : `Недостача ${diff}`;
              const markerClass = diff === 0 ? "text-green-500" : diff > 0 ? "text-yellow-500" : "text-red-500";
              const marker = diff === 0 ? "✓" : diff > 0 ? "★" : "⚠";
              const sameCategory = (products ?? []).filter((x) => x.category && x.category === p.category && x.id !== p.id);
              const suggestedId = suggestions[p.id];
              return (
                <>
                  {/* Desktop view */}
                  <tr key={p.id} className="border-b hidden lg:table-row" style={{ borderColor: "rgba(255, 255, 255, 0.1)" }}>
                    <td className="p-3 font-medium text-white">{p.name}</td>
                    <td className="p-3 text-gray-300">{p.categoryRef?.name ?? p.category ?? "—"}</td>
                    <td className="p-3 text-gray-300">{p.subcategory ?? "—"}</td>
                    <td className="p-3 text-gray-300">{Number(p.price).toFixed(2)} ₽</td>
                    <td className="p-3 text-gray-300 font-mono">{p.stock ?? 0}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        <input 
                          value={c.system} 
                          onChange={(e) => setCounts((m) => ({ ...m, [p.id]: { ...c, system: e.target.value } }))} 
                          onFocus={(e) => handleInputFocus(e, p.id, "system")}
                          className="border rounded px-2 py-1 w-20 bg-gray-900 text-white border-gray-700 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                          type="number"
                          min="0"
                        />
                        <button 
                          onClick={() => saveProduct(p.id)}
                          className="p-1 rounded bg-green-600 hover:bg-green-700 transition-all"
                          title="Сохранить"
                        >
                          {NI ? <NI.Check className="w-4 h-4 text-white" /> : "✓"}
                        </button>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        <input 
                          value={c.actual} 
                          onChange={(e) => setCounts((m) => ({ ...m, [p.id]: { ...c, actual: e.target.value } }))} 
                          onFocus={(e) => handleInputFocus(e, p.id, "actual")}
                          className="border rounded px-2 py-1 w-20 bg-gray-900 text-white border-gray-700 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                          type="number"
                          min="0"
                        />
                        <button 
                          onClick={() => saveProduct(p.id)}
                          className="p-1 rounded bg-green-600 hover:bg-green-700 transition-all"
                          title="Сохранить"
                        >
                          {NI ? <NI.Check className="w-4 h-4 text-white" /> : "✓"}
                        </button>
                      </div>
                    </td>
                    <td className="p-3 text-gray-300">{statusStr}</td>
                    <td className="p-3 text-lg font-bold"><span className={markerClass}>{marker}</span></td>
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
                              <span className="text-gray-400">Предложение:</span>
                              <button className="px-2 py-1 rounded bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 transition-all" onClick={() => setCounts((m) => ({ ...m, [p.id]: { ...c, replacementId: suggestedId } }))}>Да</button>
                              <button className="px-2 py-1 rounded border border-gray-700 text-gray-300 hover:border-red-500/50 hover:bg-red-500/10 transition-all" onClick={() => setCounts((m) => ({ ...m, [p.id]: { ...c, replacementId: undefined } }))}>Нет</button>
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-500">Нет вариантов</span>
                      )}
                    </td>
                  </tr>

                  {/* Mobile view */}
                  <tr key={`${p.id}-mobile`} className="border-b lg:hidden" style={{ borderColor: "rgba(255, 255, 255, 0.1)" }}>
                    <td className="p-3" colSpan={10}>
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-white text-base mb-1">{p.name}</div>
                            <div className="text-xs text-gray-400">
                              Категория: {p.categoryRef?.name ?? p.category ?? "—"}
                            </div>
                            {p.subcategory && (
                              <div className="text-xs text-gray-400">
                                Подкатегория: {p.subcategory}
                              </div>
                            )}
                            <div className="text-xs text-gray-400 mt-1">
                              Цена: {Number(p.price).toFixed(2)} ₽
                            </div>
                            <div className="text-xs text-gray-300 mt-1 font-mono">
                              Остаток: {p.stock ?? 0}
                            </div>
                          </div>
                          <div className="text-2xl font-bold"><span className={markerClass}>{marker}</span></div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs mb-1 text-gray-400">По системе</label>
                            <div className="flex items-center gap-1">
                              <input 
                                value={c.system} 
                                onChange={(e) => setCounts((m) => ({ ...m, [p.id]: { ...c, system: e.target.value } }))} 
                                onFocus={(e) => handleInputFocus(e, p.id, "system")}
                                className="border rounded px-2 py-1 w-20 bg-gray-900 text-white border-gray-700 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                                type="number"
                                min="0"
                              />
                              <button 
                                onClick={() => saveProduct(p.id)}
                                className="p-1.5 rounded bg-green-600 hover:bg-green-700 transition-all"
                                title="Сохранить"
                              >
                                {NI ? <NI.Check className="w-4 h-4 text-white" /> : "✓"}
                              </button>
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs mb-1 text-gray-400">Факт</label>
                            <div className="flex items-center gap-1">
                              <input 
                                value={c.actual} 
                                onChange={(e) => setCounts((m) => ({ ...m, [p.id]: { ...c, actual: e.target.value } }))} 
                                onFocus={(e) => handleInputFocus(e, p.id, "actual")}
                                className="border rounded px-2 py-1 w-20 bg-gray-900 text-white border-gray-700 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                                type="number"
                                min="0"
                              />
                              <button 
                                onClick={() => saveProduct(p.id)}
                                className="p-1.5 rounded bg-green-600 hover:bg-green-700 transition-all"
                                title="Сохранить"
                              >
                                {NI ? <NI.Check className="w-4 h-4 text-white" /> : "✓"}
                              </button>
                            </div>
                          </div>
                        </div>

                        <div>
                          <div className="text-xs mb-1 text-gray-400">Статус: <span className="text-white font-medium">{statusStr}</span></div>
                          {sameCategory.length > 0 && (
                            <div className="mt-2">
                              <select value={c.replacementId ?? ""} onChange={(e) => setCounts((m) => ({ ...m, [p.id]: { ...c, replacementId: e.target.value || undefined } }))} className="border rounded px-2 py-1 w-full bg-gray-900 text-white border-gray-700">
                                <option value="">Замена: —</option>
                                {sameCategory.map((x) => (
                                  <option key={x.id} value={x.id}>{x.name}</option>
                                ))}
                              </select>
                              {suggestedId && !c.replacementId && (
                                <div className="flex items-center gap-1 text-xs mt-1">
                                  <span className="text-gray-400">Предложение:</span>
                                  <button className="px-2 py-1 rounded bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 transition-all" onClick={() => setCounts((m) => ({ ...m, [p.id]: { ...c, replacementId: suggestedId } }))}>Да</button>
                                  <button className="px-2 py-1 rounded border border-gray-700 text-gray-300 hover:border-red-500/50 hover:bg-red-500/10 transition-all" onClick={() => setCounts((m) => ({ ...m, [p.id]: { ...c, replacementId: undefined } }))}>Нет</button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      {activeTab === "minus" && (
        <div className="card p-3">
          <div className="text-sm text-white">
            <div className="flex items-center justify-between">
              <div>
                <div>Общая сумма недостач: <span className="font-medium text-red-400">{totalValue.toFixed(2)} ₽</span></div>
                <div className="mt-1">Делится на: <span className="font-medium">{selectedCount}</span> — по <span className="font-medium">{perEmployee.toFixed(2)} ₽</span> на человека</div>
              </div>
              <button className="btn-primary flex items-center gap-1" onClick={() => {
                const rowsData = rows.map((p) => {
                  const c = counts[p.id] ?? { system: "", actual: "" };
                  const system = Number(c.system || 0);
                  const actual = Number(c.actual || 0);
                  const diff = actual - system;
                  return {
                    Товар: p.name,
                    Категория: p.category ?? "—",
                    Цена: Number(p.price).toFixed(2),
                    "По системе": system,
                    Факт: actual,
                    Недостача: diff < 0 ? String(Math.abs(diff)) : "0",
                    Сумма: diff < 0 ? (Math.abs(diff) * Number(p.price)).toFixed(2) : "0",
                  };
                });
                const headers = Object.keys(rowsData[0] ?? {});
                const csv = [headers.join(";"), ...rowsData.map((r) => headers.map((h) => String((r as any)[h]).replaceAll(";", ",")).join(";"))].join("\n");
                const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `nedostachi-minus-${new Date().toISOString().slice(0,10)}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}>{NI ? <NI.Download className="w-4 h-4" /> : "⬇️"} Экспорт CSV</button>
            </div>
          </div>
        </div>
      )}

      {activeTab === "minus" && (
        <div className="card p-3">
          <div className="font-medium mb-2 text-white">Кто участвует в делении</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {(employees ?? []).map(e => (
              <label key={e.id} className="flex items-center gap-2 text-white">
                <input type="checkbox" checked={!!selectedEmp[e.id]} onChange={(ev)=> setSelectedEmp(s => ({ ...s, [e.id]: ev.target.checked }))} />
                <span>{e.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

