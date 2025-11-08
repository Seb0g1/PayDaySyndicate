"use client";
import useSWR from "swr";
import { useNextIcons } from "@/components/NI";
import { useMemo, useState, useEffect, useCallback } from "react";
import { useSuccess } from "@/components/SuccessProvider";
import { useError } from "@/components/ErrorProvider";

type Category = { id: string; name: string; parentId?: string | null };
type Product = { id: string; name: string; price: number; stock?: number; lastImportedAt?: string | null; category?: string | null; subcategory?: string | null; categoryId?: string | null; langameId?: number | null; categoryRef?: Category | null };
const fetcher = (u: string) => fetch(u).then((r) => r.json());

export default function ProductsPage() {
  const NI = useNextIcons();
  const { showSuccess } = useSuccess();
  const { showError } = useError();
  const [activeCat, setActiveCat] = useState<string>("");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ by: "name" | "price"; dir: "asc" | "desc" }>({ by: "name", dir: "asc" });
  const [stockFilter, setStockFilter] = useState<"all" | "low" | "medium" | "high" | "out">("all");
  const { data, mutate } = useSWR<Product[]>(`/api/products?categoryId=${encodeURIComponent(activeCat)}&q=${encodeURIComponent(q)}&sort=${sort.by}&dir=${sort.dir}&stockFilter=${stockFilter}`, fetcher);
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
  const [bulkCategoryId, setBulkCategoryId] = useState<string>("");
  const [bulkPrice, setBulkPrice] = useState<string>("");
  const [bulkSubAndPrice, setBulkSubAndPrice] = useState({ sub: "", price: "" });
  const [syncing, setSyncing] = useState(false);

  // Оптимизированный обработчик выбора товара
  const handleSelectProduct = useCallback((productId: string, checked: boolean) => {
    setSelected(prev => {
      if (prev[productId] === checked) return prev; // Не обновляем, если значение не изменилось
      return { ...prev, [productId]: checked };
    });
  }, []);

  // Оптимизированный обработчик выбора всех товаров
  const handleSelectAll = useCallback((checked: boolean) => {
    if (!data) return;
    const newSelected: Record<string, boolean> = {};
    data.forEach(p => {
      newSelected[p.id] = checked;
    });
    setSelected(newSelected);
  }, [data]);

  const add = async () => {
    await fetch("/api/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, price: Number(price), category: subcategory || undefined, categoryId: categoryIdNew || undefined }) });
    showSuccess("Товар добавлен!");
    setName(""); setPrice(""); setSubcategory(""); setCategoryIdNew("");
    mutate();
  };

  // Paste Excel files with Ctrl+V
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      if (!e.clipboardData) return;
      
      const items = Array.from(e.clipboardData.items);
      const fileItems = items.filter(item => item.type.indexOf('application/vnd') !== -1 || 
                                           item.type === 'application/vnd.ms-excel' ||
                                           item.type === 'application/excel' ||
                                           item.type === 'application/x-excel' ||
                                           item.type === 'application/x-msexcel');
      
      if (fileItems.length > 0) {
        e.preventDefault();
        const pastedFiles: File[] = [];
        for (const item of fileItems) {
          const blob = item.getAsFile();
          if (blob) {
            // Check if it's an Excel file by extension or mime type
            const fileName = `pasted-${Date.now()}.xlsx`;
            const file = new File([blob], fileName, { type: blob.type });
            pastedFiles.push(file);
          }
        }
        setFiles(pastedFiles);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const importXlsx = async () => {
    if (!files.length) return;
    
    if (!confirm("Импорт товаров из Excel файла.\n\nТовары из файла будут добавлены/обновлены.\nВсе товары, которых нет в файле, будут исключены из синхронизации с Langame API.\n\nПродолжить?")) {
      return;
    }
    
    const fd = new FormData();
    for (const f of files) fd.append("file", f);
    const res = await fetch("/api/products/import", { method: "POST", body: fd });
    if (!res.ok) { 
      const errorText = await res.text();
      showError(errorText || "Ошибка импорта");
      return; 
    }
    const j = await res.json();
    
    let message = `Импорт завершён! Добавлено: ${j.created}, обновлено: ${j.updated}`;
    if (j.excluded && j.excluded > 0) {
      message += `\nИсключено из синхронизации: ${j.excluded} товаров`;
    }
    
    showSuccess(message);
    setFiles([]);
    mutate();
  };

  const syncWithLangame = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/langame/sync-products", { method: "POST" });
      if (!res.ok) {
        const errorText = await res.text();
        showError(errorText || "Ошибка синхронизации");
        return;
      }
      const result = await res.json();
      let message = `Синхронизация завершена! Создано: ${result.created || 0}, обновлено: ${result.updated || 0}`;
      if (result.skippedInactive && result.skippedInactive > 0) {
        message += `\nПропущено неактивных: ${result.skippedInactive}`;
      }
      if (result.skippedExcluded && result.skippedExcluded > 0) {
        message += `\nПропущено исключенных: ${result.skippedExcluded}`;
      }
      showSuccess(message);
      mutate();
    } catch (error: any) {
      showError("Ошибка синхронизации: " + (error.message || "Неизвестная ошибка"));
    } finally {
      setSyncing(false);
    }
  };

  const excludeProduct = async (langameId: number) => {
    if (!langameId) {
      showError("У товара нет ID из Langame API");
      return;
    }

    try {
      // Получаем текущие настройки
      const settingsRes = await fetch("/api/langame/settings");
      if (!settingsRes.ok) {
        throw new Error("Не удалось загрузить настройки");
      }
      const settings = await settingsRes.json();

      // Добавляем ID в список исключений
      const excludedIds = settings.excludedProductIds || [];
      if (excludedIds.includes(langameId)) {
        showError("Товар уже в списке исключений");
        return;
      }

      const updatedExcludedIds = [...excludedIds, langameId];

      // Сохраняем обновленные настройки
      const updateRes = await fetch("/api/langame/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: settings.apiKey,
          clubId: settings.clubId,
          enabled: settings.enabled,
          baseUrl: settings.baseUrl,
          excludedProductIds: updatedExcludedIds,
        }),
      });

      if (!updateRes.ok) {
        const error = await updateRes.json();
        throw new Error(error.error || "Ошибка сохранения настроек");
      }

      showSuccess(`Товар с ID ${langameId} исключен из синхронизации`);
      mutate(); // Обновляем список товаров (исключенный товар исчезнет)
    } catch (error: any) {
      showError(error.message || "Ошибка исключения товара");
    }
  };

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    try {
      await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCatName.trim(), parentId: newCatParent || undefined })
      });
      setNewCatName('');
      setNewCatParent('');
      mutateCats();
      showSuccess('Категория добавлена!');
    } catch (error: any) {
      showError('Ошибка при добавлении категории');
    }
  };

  const excludeSelectedProducts = async () => {
    const selectedIds = Object.keys(selected).filter((id) => selected[id]);
    if (selectedIds.length === 0) {
      showError("Выберите товары для исключения");
      return;
    }

    // Получаем товары с langameId
    const productsToExclude = (data || []).filter(
      (p) => selectedIds.includes(p.id) && p.langameId
    );

    if (productsToExclude.length === 0) {
      showError("У выбранных товаров нет ID из Langame API");
      return;
    }

    const langameIds = productsToExclude.map((p) => p.langameId!);

    try {
      // Получаем текущие настройки
      const settingsRes = await fetch("/api/langame/settings");
      if (!settingsRes.ok) {
        throw new Error("Не удалось загрузить настройки");
      }
      const settings = await settingsRes.json();

      // Добавляем ID в список исключений
      const excludedIds = settings.excludedProductIds || [];
      const newIds = langameIds.filter((id) => !excludedIds.includes(id));
      
      if (newIds.length === 0) {
        showError("Все выбранные товары уже в списке исключений");
        return;
      }

      const updatedExcludedIds = [...excludedIds, ...newIds];

      // Сохраняем обновленные настройки
      const updateRes = await fetch("/api/langame/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: settings.apiKey,
          clubId: settings.clubId,
          enabled: settings.enabled,
          baseUrl: settings.baseUrl,
          excludedProductIds: updatedExcludedIds,
        }),
      });

      if (!updateRes.ok) {
        const error = await updateRes.json();
        throw new Error(error.error || "Ошибка сохранения настроек");
      }

      showSuccess(`Исключено товаров: ${newIds.length} из ${productsToExclude.length}`);
      setSelected({}); // Очищаем выбор
      mutate(); // Обновляем список товаров (исключенные товары исчезнут)
    } catch (error: any) {
      showError(error.message || "Ошибка исключения товаров");
    }
  };

  return (
    <div className="space-y-4">
      <div className="card p-3 flex flex-wrap items-center gap-2">
        <button onClick={() => setActiveCat("")} className={`px-3 py-1 rounded transition-all ${activeCat === "" ? "bg-gradient-to-r from-red-500 to-red-600 text-white shadow-[0_0_12px_rgba(255,0,0,0.3)]" : "bg-gray-900/50 text-gray-300 border border-gray-700 hover:border-red-500/50 hover:bg-red-500/10"}`}>Все</button>
        {(categories ?? []).map((c) => (
          <button key={c.id} onClick={() => setActiveCat(c.id)} className={`px-3 py-1 rounded transition-all ${activeCat === c.id ? "bg-gradient-to-r from-red-500 to-red-600 text-white shadow-[0_0_12px_rgba(255,0,0,0.3)]" : "bg-gray-900/50 text-gray-300 border border-gray-700 hover:border-red-500/50 hover:bg-red-500/10"}`}>{c.name}</button>
        ))}
        <div className="w-full sm:w-auto sm:ml-auto flex flex-col sm:flex-row items-stretch sm:items-end gap-2">
          <div className="flex-1 sm:flex-initial">
            <label className="block text-xs mb-1" style={{ color: "rgba(255, 255, 255, 0.7)" }}>Поиск</label>
            <input value={q} onChange={(e) => setQ(e.target.value)} className="border rounded px-2 py-1 w-full" placeholder="Название" />
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: "rgba(255, 255, 255, 0.7)" }}>Остаток</label>
            <select value={stockFilter} onChange={(e) => setStockFilter(e.target.value as any)} className="border rounded px-2 py-1 w-full sm:w-auto">
              <option value="all">Все</option>
              <option value="out">Нет в наличии (0)</option>
              <option value="low">Мало (1-5)</option>
              <option value="medium">Средне (6-15)</option>
              <option value="high">Много (16+)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: "rgba(255, 255, 255, 0.7)" }}>Сортировка</label>
            <select value={`${sort.by}:${sort.dir}`} onChange={(e) => { const [by, dir] = e.target.value.split(":"); setSort({ by: by as any, dir: dir as any }); }} className="border rounded px-2 py-1 w-full sm:w-auto">
              <option value="name:asc">Имя ↑</option>
              <option value="name:desc">Имя ↓</option>
              <option value="price:asc">Цена ↑</option>
              <option value="price:desc">Цена ↓</option>
            </select>
          </div>
        </div>
      </div>
      <div className="card p-3 flex flex-col sm:flex-row items-stretch sm:items-end gap-2">
        <div className="flex-1">
          <label className="block text-xs mb-1" style={{ color: "rgba(255, 255, 255, 0.7)" }}>Импорт из Excel (.xlsx)</label>
          <input type="file" accept=".xlsx,.xls" multiple onChange={(e) => setFiles(Array.from(e.target.files ?? []))} className="w-full" />
        </div>
        <button disabled={!files.length} className="btn-primary px-3 py-2 disabled:opacity-60 flex items-center justify-center gap-1" onClick={importXlsx}>{NI ? <NI.Upload className="w-4 h-4" /> : "⬆️"} Импортировать {files.length ? `(${files.length})` : ""}</button>
        <button disabled={syncing} className="btn-primary px-3 py-2 disabled:opacity-60 flex items-center justify-center gap-1" onClick={syncWithLangame}>
          {NI ? <NI.RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} /> : "🔄"} 
          {syncing ? "Синхронизация..." : "Синхронизировать"}
        </button>
        <button className="btn-ghost flex items-center justify-center gap-1" onClick={() => setShowCats(true)}>{NI ? <NI.Tag className="w-4 h-4" /> : "🏷️"} Категории…</button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        <input placeholder="Наименование" value={name} onChange={(e) => setName(e.target.value)} className="border rounded px-2 py-1" />
        <input placeholder="Цена" value={price} onChange={(e) => setPrice(e.target.value)} className="border rounded px-2 py-1" />
        <select value={categoryIdNew} onChange={(e) => setCategoryIdNew(e.target.value)} className="border rounded px-2 py-1">
          <option value="">Категория (основная)</option>
          {(categories ?? []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <div className="flex gap-2">
          <input placeholder="Подкатегория (тег)" value={subcategory} onChange={(e) => setSubcategory(e.target.value)} className="border rounded px-2 py-1 flex-1" />
          <button className="btn-primary px-3 whitespace-nowrap" onClick={add}>Добавить</button>
          <button className="btn-ghost flex items-center gap-1 whitespace-nowrap" onClick={() => setShowBulk(true)}>{NI ? <NI.Rows className="w-4 h-4" /> : "📋"}</button>
        </div>
      </div>
      <div className="card p-3 mb-2 flex items-end gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <select 
            value={bulkCategoryId} 
            onChange={(e)=>setBulkCategoryId(e.target.value)} 
            className="border rounded px-2 py-1 bg-gray-900 text-white border-gray-700"
          >
            <option value="">Категория для выбранных</option>
            {(categories ?? []).map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <button 
            className="btn-primary px-3 py-2" 
            onClick={async ()=>{
              const ids = Object.keys(selected).filter(k=>selected[k]);
              if (!ids.length) { showError('Выберите товары'); return; }
              if (!bulkCategoryId) { showError('Выберите категорию'); return; }
              try {
                const res = await fetch('/api/products/bulk-category', { 
                  method: 'POST', 
                  headers: { 'Content-Type':'application/json' }, 
                  body: JSON.stringify({ ids, categoryId: bulkCategoryId }) 
                });
                if (!res.ok) {
                  const error = await res.text();
                  showError(error || 'Ошибка при обновлении категории');
                  return;
                }
                const result = await res.json();
                showSuccess(`Категория установлена для ${result.updated} товаров`);
                setBulkCategoryId(''); 
                setSelected({}); 
                mutate();
              } catch (error: any) {
                showError('Ошибка при обновлении категории');
              }
            }}
          >
            Применить категорию
          </button>
          <input value={bulkSub} onChange={(e)=>setBulkSub(e.target.value)} className="border rounded px-2 py-1 bg-gray-900 text-white border-gray-700" placeholder="Подкатегория для выбранных" />
          <button className="btn-primary px-3 py-2" onClick={async ()=>{
            const ids = Object.keys(selected).filter(k=>selected[k]);
            if (!ids.length) { showError('Выберите товары'); return; }
            try {
              const res = await fetch('/api/products/bulk-subcategory', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ ids, category: bulkSub }) });
              if (!res.ok) {
                const error = await res.text();
                showError(error || 'Ошибка при обновлении подкатегории');
                return;
              }
              showSuccess('Подкатегория установлена');
              setBulkSub(''); 
              setSelected({}); 
              mutate();
            } catch (error: any) {
              showError('Ошибка при обновлении подкатегории');
            }
          }}>Применить подкатегорию</button>
          <input 
            type="number" 
            value={bulkPrice} 
            onChange={(e)=>setBulkPrice(e.target.value)} 
            className="border rounded px-2 py-1 bg-gray-900 text-white border-gray-700" 
            placeholder="Цена для выбранных" 
            step="0.01"
            min="0"
          />
          <button 
            className="btn-primary px-3 py-2" 
            onClick={async ()=>{
              const ids = Object.keys(selected).filter(k=>selected[k]);
              if (!ids.length) { showError('Выберите товары'); return; }
              const priceValue = parseFloat(bulkPrice);
              if (isNaN(priceValue) || priceValue < 0) {
                showError('Введите корректную цену (>= 0)');
                return;
              }
              try {
                const res = await fetch('/api/products/bulk-price', { 
                  method: 'POST', 
                  headers: { 'Content-Type':'application/json' }, 
                  body: JSON.stringify({ ids, price: priceValue }) 
                });
                if (!res.ok) {
                  const error = await res.text();
                  showError(error || 'Ошибка при обновлении цены');
                  return;
                }
                const result = await res.json();
                showSuccess(`Цена установлена для ${result.updated} товаров`);
                setBulkPrice(''); 
                setSelected({}); 
                mutate();
              } catch (error: any) {
                showError('Ошибка при обновлении цены');
              }
            }}
          >
            Применить цену
          </button>
          <div className="flex items-center gap-2 border-t pt-2 mt-2 border-gray-700">
            <input 
              value={bulkSubAndPrice.sub} 
              onChange={(e)=>setBulkSubAndPrice({...bulkSubAndPrice, sub: e.target.value})} 
              className="border rounded px-2 py-1 bg-gray-900 text-white border-gray-700" 
              placeholder="Подкатегория" 
            />
            <input 
              type="number" 
              value={bulkSubAndPrice.price} 
              onChange={(e)=>setBulkSubAndPrice({...bulkSubAndPrice, price: e.target.value})} 
              className="border rounded px-2 py-1 bg-gray-900 text-white border-gray-700" 
              placeholder="Цена" 
              step="0.01"
              min="0"
            />
            <button 
              className="btn-primary px-3 py-2" 
              onClick={async ()=>{
                const ids = Object.keys(selected).filter(k=>selected[k]);
                if (!ids.length) { showError('Выберите товары'); return; }
                const priceValue = bulkSubAndPrice.price ? parseFloat(bulkSubAndPrice.price) : undefined;
                if (bulkSubAndPrice.price && (isNaN(priceValue!) || priceValue! < 0)) {
                  showError('Введите корректную цену (>= 0)');
                  return;
                }
                if (!bulkSubAndPrice.sub && !bulkSubAndPrice.price) {
                  showError('Введите подкатегорию или цену (или оба)');
                  return;
                }
                try {
                  const res = await fetch('/api/products/bulk-subcategory-price', { 
                    method: 'POST', 
                    headers: { 'Content-Type':'application/json' }, 
                    body: JSON.stringify({ 
                      ids, 
                      category: bulkSubAndPrice.sub || null,
                      price: priceValue 
                    }) 
                  });
                  if (!res.ok) {
                    const error = await res.text();
                    showError(error || 'Ошибка при обновлении');
                    return;
                  }
                  const result = await res.json();
                  const updates = [];
                  if (bulkSubAndPrice.sub) updates.push('подкатегория');
                  if (bulkSubAndPrice.price) updates.push('цена');
                  showSuccess(`${updates.join(' и ')} установлены для ${result.updated} товаров`);
                  setBulkSubAndPrice({ sub: '', price: '' }); 
                  setSelected({}); 
                  mutate();
                } catch (error: any) {
                  showError('Ошибка при обновлении');
                }
              }}
            >
              Применить подкатегорию + цену
            </button>
          </div>
          <button 
            className="btn-secondary px-3 py-2 flex items-center gap-1"
            onClick={excludeSelectedProducts}
            title="Исключить выбранные товары из синхронизации с Langame"
          >
            {NI ? <NI.AlertTriangle className="w-4 h-4" /> : "⚠️"} Исключить из синхронизации
          </button>
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
           <thead className="hidden sm:table-header-group">
             <tr className="text-left border-b" style={{ borderColor: "rgba(255, 0, 0, 0.2)" }}>
               <th className="p-3 text-white font-semibold">
                 <input type="checkbox" onChange={(e)=>handleSelectAll(e.target.checked)} />
               </th>
               <th className="p-3 text-white font-semibold">Наименование</th>
               <th className="p-3 text-white font-semibold">ID</th>
               <th className="p-3 text-white font-semibold">Цена</th>
               <th className="p-3 text-white font-semibold">Остаток</th>
               <th className="p-3 text-white font-semibold">Импорт (МСК)</th>
               <th className="p-3 text-white font-semibold">Категория</th>
               <th className="p-3 text-white font-semibold">Подкатегория</th>
               <th className="p-3 text-white font-semibold"></th>
             </tr>
           </thead>
          <tbody>
            {(data ?? []).map((p) => (
              <>
              <tr key={p.id} className="border-b hidden sm:table-row" style={{ borderColor: "rgba(255, 255, 255, 0.1)" }}>
                <td className="p-3"><input type="checkbox" checked={!!selected[p.id]} onChange={(e)=> handleSelectProduct(p.id, e.target.checked)} /></td>
                <td className="p-3 text-white">{p.name}</td>
                <td className="p-3 text-gray-400 font-mono text-xs">
                  {p.langameId ? (
                    <span className="px-2 py-1 rounded bg-gray-800 text-gray-300">{p.langameId}</span>
                  ) : (
                    <span className="text-gray-500">—</span>
                  )}
                </td>
                <td className="p-3 text-gray-300">{Number(p.price).toFixed(2)}</td>
                 <td className="p-3 text-gray-300">{p.stock ?? 0}</td>
                 <td className="p-3 text-gray-300">{p.lastImportedAt ? new Date(p.lastImportedAt).toLocaleString("ru-RU", { timeZone: "Europe/Moscow" }) : "—"}</td>
                 <td className="p-2">
                   <InlineCategoryEditor 
                     value={p.categoryId || ""} 
                     categories={categories ?? []}
                     currentCategoryName={p.categoryRef?.name ?? ""}
                     onSave={async (categoryId) => {
                       try {
                         const res = await fetch(`/api/products/${p.id}`, { 
                           method: "PATCH", 
                           headers: { "Content-Type": "application/json" }, 
                           body: JSON.stringify({ categoryId: categoryId || null }) 
                         });
                         if (!res.ok) {
                           let errorText = "";
                           try {
                             const errorData = await res.json();
                             errorText = errorData.error || "Ошибка при обновлении категории";
                           } catch {
                             errorText = await res.text() || "Ошибка при обновлении категории";
                           }
                           showError(errorText);
                           return;
                         }
                         showSuccess("Категория обновлена");
                         mutate();
                       } catch (error: any) {
                         showError("Ошибка при обновлении категории");
                       }
                     }} 
                   />
                 </td>
                 <td className="p-2">
                   <InlineSubEditor value={p.category ?? ""} onSave={async (v) => {
                     try {
                       const res = await fetch(`/api/products/${p.id}`, { 
                         method: "PATCH", 
                         headers: { "Content-Type": "application/json" }, 
                         body: JSON.stringify({ category: v || null }) 
                       });
                       if (!res.ok) {
                         let errorText = "";
                         try {
                           const errorData = await res.json();
                           errorText = errorData.error || "Ошибка при обновлении подкатегории";
                         } catch {
                           errorText = await res.text() || "Ошибка при обновлении подкатегории";
                         }
                         showError(errorText);
                         return;
                       }
                       showSuccess("Подкатегория обновлена");
                       mutate();
                     } catch (error: any) {
                       showError("Ошибка при обновлении подкатегории");
                     }
                   }} />
                 </td>
                 <td className="p-2 text-right">
                  <div className="flex gap-3 justify-end items-center">
                    {p.langameId && (
                      <button
                        className="text-orange-600 hover:text-orange-500 flex items-center gap-1 text-xs"
                        onClick={() => excludeProduct(p.langameId!)}
                        title="Исключить из синхронизации"
                      >
                        {NI ? <NI.AlertTriangle className="w-4 h-4" /> : "⚠️"} <span className="hidden lg:inline">Исключить</span>
                      </button>
                    )}
                    <button className="text-red-600 flex items-center gap-1" onClick={async () => {
                       const newName = prompt("Название", p.name);
                       if (newName == null) return;
                       const newPriceStr = prompt("Цена", String(p.price));
                       if (newPriceStr == null) return;
                       const body: any = { name: newName, price: Number(newPriceStr) };
                       const res = await fetch(`/api/products/${p.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
                       if (!res.ok) alert(await res.text());
                       mutate();
                    }}>{NI ? <NI.Edit className="w-4 h-4" /> : "✏️"} <span className="hidden md:inline">Изменить</span></button>
                    <button className="text-red-700 flex items-center gap-1" onClick={async () => { const res = await fetch(`/api/products/${p.id}`, { method: "DELETE" }); if (!res.ok) { const t = await res.text(); alert(t || "Не удалось удалить товар"); } else { mutate(); } }}>{NI ? <NI.Trash className="w-4 h-4" /> : "🗑️"} <span className="hidden md:inline">Удалить</span></button>
                  </div>
                 </td>
              </tr>
              {/* Mobile view */}
              <tr key={`${p.id}-mobile`} className="border-b sm:hidden" style={{ borderColor: "rgba(255, 255, 255, 0.1)" }}>
                <td className="p-3" colSpan={8}>
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-white text-base mb-1">{p.name}</div>
                        <div className="space-y-1 text-xs text-gray-400">
                          {p.langameId && <div>🆔 ID: <span className="font-mono text-gray-300">{p.langameId}</span></div>}
                          <div>💰 Цена: {Number(p.price).toFixed(2)} ₽</div>
                          <div>📦 Остаток: {p.stock ?? 0}</div>
                          {p.lastImportedAt && <div>📅 {new Date(p.lastImportedAt).toLocaleString("ru-RU", { timeZone: "Europe/Moscow" })}</div>}
                        </div>
                        <div className="mt-2 space-y-2">
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Категория:</label>
                            <InlineCategoryEditor 
                              value={p.categoryId || ""} 
                              categories={categories ?? []}
                              currentCategoryName={p.categoryRef?.name ?? ""}
                              onSave={async (categoryId) => {
                                const res = await fetch(`/api/products/${p.id}`, { 
                                  method: "PATCH", 
                                  headers: { "Content-Type": "application/json" }, 
                                  body: JSON.stringify({ categoryId: categoryId || null }) 
                                });
                                if (!res.ok) alert(await res.text());
                                mutate();
                              }} 
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Подкатегория:</label>
                            <InlineSubEditor value={p.category ?? ""} onSave={async (v) => {
                              try {
                                const res = await fetch(`/api/products/${p.id}`, { 
                                  method: "PATCH", 
                                  headers: { "Content-Type": "application/json" }, 
                                  body: JSON.stringify({ category: v || null }) 
                                });
                                if (!res.ok) {
                                  let errorText = "";
                                  try {
                                    const errorData = await res.json();
                                    errorText = errorData.error || "Ошибка при обновлении подкатегории";
                                  } catch {
                                    errorText = await res.text() || "Ошибка при обновлении подкатегории";
                                  }
                                  showError(errorText);
                                  return;
                                }
                                showSuccess("Подкатегория обновлена");
                                mutate();
                              } catch (error: any) {
                                showError("Ошибка при обновлении подкатегории");
                              }
                            }} />
                          </div>
                        </div>
                      </div>
                      <div>
                        <input type="checkbox" checked={!!selected[p.id]} onChange={(e)=> handleSelectProduct(p.id, e.target.checked)} />
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2 border-t" style={{ borderColor: "rgba(255, 255, 255, 0.1)" }}>
                      {p.langameId && (
                        <button
                          className="text-orange-600 hover:text-orange-500 flex items-center gap-1 flex-1 justify-center text-xs"
                          onClick={() => excludeProduct(p.langameId!)}
                          title="Исключить из синхронизации"
                        >
                          {NI ? <NI.AlertTriangle className="w-4 h-4" /> : "⚠️"} Исключить
                        </button>
                      )}
                      <button className="text-red-600 flex items-center gap-1 flex-1 justify-center" onClick={async () => {
                         const newName = prompt("Название", p.name);
                         if (newName == null) return;
                         const newPriceStr = prompt("Цена", String(p.price));
                         if (newPriceStr == null) return;
                         const body: any = { name: newName, price: Number(newPriceStr) };
                         const res = await fetch(`/api/products/${p.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
                         if (!res.ok) alert(await res.text());
                         mutate();
                      }}>{NI ? <NI.Edit className="w-4 h-4" /> : "✏️"} Изменить</button>
                      <button className="text-red-700 flex items-center gap-1 flex-1 justify-center" onClick={async () => { const res = await fetch(`/api/products/${p.id}`, { method: "DELETE" }); if (!res.ok) { const t = await res.text(); alert(t || "Не удалось удалить товар"); } else { mutate(); } }}>{NI ? <NI.Trash className="w-4 h-4" /> : "🗑️"} Удалить</button>
                    </div>
                  </div>
                </td>
              </tr>
              </>
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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0, 0, 0, 0.8)" }}
          onClick={() => setShowCats(false)}
        >
          <div className="modal-panel max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Категории</h2>
              <button
                className="text-white text-2xl hover:text-red-500 transition-colors"
                onClick={() => setShowCats(false)}
              >
                ×
              </button>
            </div>

            {/* Форма добавления категории */}
            <div className="card p-4 mb-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Название категории</label>
                  <input
                    placeholder="Название категории"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    className="border rounded px-3 py-2 w-full bg-gray-900 text-white border-gray-700 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newCatName.trim()) {
                        e.preventDefault();
                        handleAddCategory();
                      }
                    }}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Родительская категория</label>
                  <select
                    value={newCatParent}
                    onChange={(e) => setNewCatParent(e.target.value)}
                    className="border rounded px-3 py-2 w-full bg-gray-900 text-white border-gray-700 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                  >
                    <option value="">Без родителя</option>
                    {(categories ?? []).map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  className="btn-primary px-4 py-2 flex items-center gap-2"
                  onClick={handleAddCategory}
                  disabled={!newCatName.trim()}
                >
                  {NI ? <NI.Plus className="w-4 h-4" /> : "+"} Добавить категорию
                </button>
              </div>
            </div>

            {/* Список категорий */}
            <div className="card p-4 mb-4">
              <h3 className="text-lg font-semibold text-white mb-3">Основные категории</h3>
              <div className="overflow-auto max-h-60">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b" style={{ borderColor: "rgba(255, 0, 0, 0.2)" }}>
                      <th className="p-3 text-white font-semibold text-left">Категория</th>
                      <th className="p-3 text-white font-semibold text-left">Родитель</th>
                      <th className="p-3 text-white font-semibold text-right"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(categories ?? []).map(c => (
                      <tr key={c.id} className="border-b" style={{ borderColor: "rgba(255, 255, 255, 0.1)" }}>
                        <td className="p-3 text-gray-300">{c.name}</td>
                        <td className="p-3 text-gray-400">
                          {(categories ?? []).find(x => x.id === c.parentId)?.name ?? '—'}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            className="text-red-600 hover:text-red-500 flex items-center gap-1"
                            onClick={async () => {
                              if (!confirm(`Удалить категорию "${c.name}"?`)) return;
                              await fetch(`/api/categories/${c.id}`, { method: 'DELETE' });
                              mutateCats();
                            }}
                          >
                            {NI ? <NI.Trash className="w-4 h-4" /> : "🗑️"} Удалить
                          </button>
                        </td>
                      </tr>
                    ))}
                    {(!categories || categories.length === 0) && (
                      <tr>
                        <td colSpan={3} className="p-3 text-center text-gray-400">
                          Нет категорий
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Список подкатегорий */}
            <div className="card p-4">
              <h3 className="text-lg font-semibold text-white mb-3">Подкатегории (теги)</h3>
              <div className="overflow-auto max-h-60">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b" style={{ borderColor: "rgba(255, 0, 0, 0.2)" }}>
                      <th className="p-3 text-white font-semibold text-left">Подкатегория (тег)</th>
                      <th className="p-3 text-white font-semibold text-right"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(tags ?? []).map(t => (
                      <tr key={t} className="border-b" style={{ borderColor: "rgba(255, 255, 255, 0.1)" }}>
                        <td className="p-3 text-gray-300">{t}</td>
                        <td className="p-3 text-right">
                          <button
                            className="text-red-600 hover:text-red-500 flex items-center gap-1 ml-auto"
                            onClick={async () => {
                              if (!confirm(`Удалить подкатегорию "${t}"?`)) return;
                              await fetch(`/api/subcategories/${encodeURIComponent(t)}`, { method: 'DELETE' });
                              mutateTags();
                            }}
                          >
                            {NI ? <NI.Trash className="w-4 h-4" /> : "🗑️"} Удалить
                          </button>
                        </td>
                      </tr>
                    ))}
                    {(!tags || tags.length === 0) && (
                      <tr>
                        <td colSpan={2} className="p-3 text-center text-gray-400">
                          Нет подкатегорий
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InlineCategoryEditor({ 
  value, 
  categories, 
  currentCategoryName,
  onSave 
}: { 
  value: string; 
  categories: Category[]; 
  currentCategoryName: string;
  onSave: (v: string) => Promise<void> 
}) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);
  const NI = useNextIcons();
  
  return (
    <div>
      {!editing ? (
        <div className="inline-flex items-center gap-2">
          <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs">
            {currentCategoryName || "—"}
          </span>
          <button 
            className="text-blue-600 hover:text-blue-500" 
            onClick={() => { setVal(value); setEditing(true); }}
            title="Изменить категорию"
          >
            {NI ? <NI.Edit className="w-3 h-3" /> : "✎"}
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <select 
            value={val} 
            onChange={(e) => setVal(e.target.value)} 
            className="border rounded px-2 py-1 bg-gray-900 text-white border-gray-700"
            autoFocus
          >
            <option value="">— Без категории —</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <button 
            className="btn-primary px-2 py-1 text-xs" 
            onClick={async () => { 
              await onSave(val); 
              setEditing(false); 
            }}
          >
            {NI ? <NI.Check className="w-3 h-3" /> : "✓"}
          </button>
          <button 
            className="rounded border px-2 py-1 text-xs hover:bg-gray-800" 
            onClick={() => setEditing(false)}
          >
            {NI ? <NI.X className="w-3 h-3" /> : "✕"}
          </button>
        </div>
      )}
    </div>
  );
}

function InlineSubEditor({ value, onSave }: { value: string; onSave: (v: string) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);
  const NI = useNextIcons();
  
  return (
    <div>
      {!editing ? (
        <div className="inline-flex items-center gap-2">
          <span className="px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs">{value || "—"}</span>
          <button 
            className="text-red-600 hover:text-red-500" 
            onClick={() => { setVal(value); setEditing(true); }}
            title="Изменить подкатегорию"
          >
            {NI ? <NI.Edit className="w-3 h-3" /> : "✎"}
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <input 
            value={val} 
            onChange={(e) => setVal(e.target.value)} 
            className="border rounded px-2 py-1 bg-gray-900 text-white border-gray-700" 
            placeholder="Подкатегория"
            autoFocus
          />
          <button 
            className="btn-primary px-2 py-1 text-xs" 
            onClick={async () => { 
              await onSave(val.trim()); 
              setEditing(false); 
            }}
          >
            {NI ? <NI.Check className="w-3 h-3" /> : "✓"}
          </button>
          <button 
            className="rounded border px-2 py-1 text-xs hover:bg-gray-800" 
            onClick={() => setEditing(false)}
          >
            {NI ? <NI.X className="w-3 h-3" /> : "✕"}
          </button>
        </div>
      )}
    </div>
  );
}


