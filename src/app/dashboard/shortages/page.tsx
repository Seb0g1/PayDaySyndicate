"use client";
import useSWR from "swr";
import { useState } from "react";
import { useNextIcons } from "@/components/NI";
import { useSuccess } from "@/components/SuccessProvider";
import { useRouter } from "next/navigation";

type InventoryCount = { id: string; name: string; date: string; data: any; status: string; archived: boolean; createdAt: string; updatedAt: string };

const fetcher = (u: string) => fetch(u).then((r) => r.json());

export default function ShortagesPage() {
  const NI = useNextIcons();
  const router = useRouter();
  const { showSuccess } = useSuccess();
  const { data: savedCounts, mutate: mutateCounts } = useSWR<InventoryCount[]>("/api/inventory-counts", fetcher);
  const { data: products } = useSWR("/api/products", fetcher);

  const [newCountName, setNewCountName] = useState("");
  const [countDate, setCountDate] = useState(new Date().toISOString().slice(0, 10));

  const createNewCount = async () => {
    if (!newCountName.trim()) {
      alert("Введите название пересчета");
      return;
    }
    
    // Инициализируем пустые данные для всех товаров
    const initialCounts: Record<string, { system: string; actual: string; replacementId?: string }> = {};
    for (const p of products ?? []) {
      initialCounts[p.id] = { system: String(p.stock ?? 0), actual: "" };
    }
    
    try {
      const res = await fetch("/api/inventory-counts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCountName,
          date: countDate,
          data: initialCounts,
          status: "DRAFT",
        }),
      });
      if (!res.ok) throw new Error("Ошибка при создании пересчета");
      const result = await res.json();
      showSuccess("Пересчет создан!");
      setNewCountName("");
      mutateCounts();
      // Переходим на страницу пересчета
      router.push(`/dashboard/shortages/count/${result.id}`);
    } catch (error) {
      alert("Ошибка при создании пересчета");
    }
  };

  const deleteCount = async (countId: string, countName: string) => {
    if (!confirm(`Удалить пересчет "${countName}"?`)) return;
    try {
      const res = await fetch(`/api/inventory-counts/${countId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Ошибка при удалении");
      showSuccess("Пересчет удален!");
      mutateCounts();
    } catch (error) {
      alert("Ошибка при удалении пересчета");
    }
  };

  const archiveCount = async (countId: string, countName: string, archived: boolean) => {
    try {
      const res = await fetch(`/api/inventory-counts/${countId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived }),
      });
      if (!res.ok) throw new Error("Ошибка при архивировании");
      showSuccess(archived ? "Пересчет отправлен в архив!" : "Пересчет восстановлен из архива!");
      mutateCounts();
    } catch (error) {
      alert("Ошибка при архивировании пересчета");
    }
  };

  return (
    <div className="space-y-4">
      {/* Кнопка создания нового пересчета */}
      <div className="card p-3 sm:p-4">
        <h2 className="text-lg sm:text-xl font-bold text-white mb-4">Пересчеты товаров</h2>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <input 
            type="text" 
            value={newCountName}
            onChange={(e) => setNewCountName(e.target.value)}
            placeholder="Название пересчета..."
            className="border rounded px-3 py-2 flex-1 bg-gray-900 text-white border-gray-700"
          />
          <input 
            type="date" 
            value={countDate} 
            onChange={(e) => setCountDate(e.target.value)} 
            className="border rounded px-3 py-2 bg-gray-900 text-white border-gray-700"
          />
          <button 
            onClick={createNewCount}
            className="btn-primary flex items-center justify-center gap-1 whitespace-nowrap"
          >
            {NI ? <NI.Plus className="w-4 h-4" /> : "+"} Создать
          </button>
        </div>
      </div>

      {/* Список пересчетов */}
      <div className="card overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="hidden sm:table-header-group">
            <tr className="text-left border-b" style={{ borderColor: "rgba(255, 0, 0, 0.2)" }}>
              <th className="p-3 text-white font-semibold">Название</th>
              <th className="p-3 text-white font-semibold">Дата</th>
              <th className="p-3 text-white font-semibold">Статус</th>
              <th className="p-3 text-white font-semibold">Создан</th>
              <th className="p-3 text-white font-semibold">Обновлен</th>
              <th className="p-3 text-white font-semibold">Действия</th>
            </tr>
          </thead>
          <tbody>
            {(savedCounts ?? []).map((count) => (
              <>
                {/* Desktop view */}
                <tr key={count.id} className="border-b hidden sm:table-row" style={{ borderColor: "rgba(255, 255, 255, 0.1)" }}>
                  <td className="p-3">
                    <button
                      onClick={() => router.push(`/dashboard/shortages/count/${count.id}`)}
                      className="text-white hover:text-red-400 font-medium"
                    >
                      {count.name}
                    </button>
                  </td>
                  <td className="p-3 text-gray-300">{new Date(count.date).toLocaleDateString("ru-RU")}</td>
                  <td className="p-3">
                    <div className="flex flex-col gap-1">
                      <span className={`px-2 py-1 rounded text-xs ${
                        count.status === "SAVED" 
                          ? "bg-green-500/20 text-green-400" 
                          : "bg-yellow-500/20 text-yellow-400"
                      }`}>
                        {count.status === "SAVED" ? "Соранен" : "Черновик"}
                      </span>
                      {count.archived && (
                        <span className="px-2 py-1 rounded text-xs bg-gray-500/20 text-gray-400">
                          Архив
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-3 text-gray-300 text-xs">
                    {new Date(count.createdAt).toLocaleDateString("ru-RU")}
                  </td>
                  <td className="p-3 text-gray-300 text-xs">
                    {new Date(count.updatedAt).toLocaleDateString("ru-RU")}
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => archiveCount(count.id, count.name, !count.archived)}
                        className={`${count.archived ? "text-yellow-500 hover:text-yellow-400" : "text-gray-500 hover:text-gray-400"}`}
                        title={count.archived ? "Восстановить из архива" : "Отправить в архив"}
                      >
                        {NI ? <NI.Box className="w-4 h-4" /> : "📦"}
                      </button>
                      <button 
                        onClick={() => deleteCount(count.id, count.name)}
                        className="text-red-500 hover:text-red-400"
                        title="Удалить"
                      >
                        {NI ? <NI.Trash className="w-4 h-4" /> : "🗑️"}
                      </button>
                    </div>
                  </td>
                </tr>
                
                {/* Mobile view */}
                <tr key={`${count.id}-mobile`} className="border-b sm:hidden" style={{ borderColor: "rgba(255, 255, 255, 0.1)" }}>
                  <td className="p-3" colSpan={6}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <button
                          onClick={() => router.push(`/dashboard/shortages/count/${count.id}`)}
                          className="text-white hover:text-red-400 font-medium text-base mb-2 block truncate"
                        >
                          {count.name}
                        </button>
                        <div className="space-y-1 text-xs text-gray-400">
                          <div>Дата: {new Date(count.date).toLocaleDateString("ru-RU")}</div>
                          <div>Создан: {new Date(count.createdAt).toLocaleDateString("ru-RU")}</div>
                          <div>Обновлен: {new Date(count.updatedAt).toLocaleDateString("ru-RU")}</div>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          <span className={`px-2 py-1 rounded text-xs ${
                            count.status === "SAVED" 
                              ? "bg-green-500/20 text-green-400" 
                              : "bg-yellow-500/20 text-yellow-400"
                          }`}>
                            {count.status === "SAVED" ? "Соранен" : "Черновик"}
                          </span>
                          {count.archived && (
                            <span className="px-2 py-1 rounded text-xs bg-gray-500/20 text-gray-400">
                              Архив
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button 
                          onClick={() => archiveCount(count.id, count.name, !count.archived)}
                          className={`${count.archived ? "text-yellow-500 hover:text-yellow-400" : "text-gray-500 hover:text-gray-400"}`}
                          title={count.archived ? "Восстановить из архива" : "Отправить в архив"}
                        >
                          {NI ? <NI.Box className="w-5 h-5" /> : "📦"}
                        </button>
                        <button 
                          onClick={() => deleteCount(count.id, count.name)}
                          className="text-red-500 hover:text-red-400"
                          title="Удалить"
                        >
                          {NI ? <NI.Trash className="w-5 h-5" /> : "🗑️"}
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
