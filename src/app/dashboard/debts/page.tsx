"use client";
import useSWR from "swr";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useNextIcons } from "@/components/NI";
import { useSuccess } from "@/components/SuccessProvider";

type Employee = { id: string; name: string };
type Product = { id: string; name: string; price: number; category?: string | null; categoryRef?: { id: string; name: string } | null };
type Category = { id: string; name: string };
type Debt = { id: string; employeeId: string; productId: string; quantity: number; date: string; amount: number; employee: Employee; product: Product };

const fetcher = (u: string) => fetch(u).then((r) => r.json());

export default function DebtsPage() {
  const NI = useNextIcons();
  const { data: session } = useSession();
  const { showSuccess } = useSuccess();
  const role = ((session as any)?.user as any)?.role as string | undefined;
  
  // Предотвращаем рендеринг до загрузки сессии (для SSR)
  if (typeof window === 'undefined') {
    return null;
  }
  const { data: me } = useSWR<any>("/api/me", fetcher);
  const myEmployeeId = me?.employeeId as string | undefined;
  const customRoleName = me?.customRole?.name as string | undefined;
  
  // Проверяем права на основе системной роли и кастомной роли
  const isDirector = role === "DIRECTOR" || role === "OWNER";
  const isSeniorAdmin = customRoleName === "Seniour_Admin";
  // Только DIRECTOR может создавать долги для всех, остальные только для себя
  const canCreateDebtsForAll = isDirector;
  const isRegularEmployee = !isDirector && !isSeniorAdmin; // Обычный сотрудник (Admin)

  const { data: employees } = useSWR<Employee[]>("/api/employees", fetcher);
  const { data: products } = useSWR<Product[]>("/api/products", fetcher);
  const { data: categories } = useSWR<Category[]>("/api/categories", fetcher);
  // API автоматически фильтрует долги по правам пользователя
  const { data, mutate } = useSWR<Debt[]>("/api/debts", fetcher);
  const [employeeId, setEmployeeId] = useState("");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [q, setQ] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [filterByEmployee, setFilterByEmployee] = useState<string>(""); // Фильтр по сотруднику

  const employeeOptions = useMemo(() => {
    if (canCreateDebtsForAll) return employees ?? [];
    // Для обычных сотрудников и старшего админа показываем только себя
    if (myEmployeeId) {
      return (employees ?? []).filter((e) => e.id === myEmployeeId);
    }
    return [];
  }, [employees, canCreateDebtsForAll, myEmployeeId]);

  const filteredProducts = useMemo(() => {
    return (products ?? []).filter((p) => {
      const byCat = categoryId ? p.categoryRef?.id === categoryId : true;
      const byQ = q.trim() ? p.name.toLowerCase().includes(q.toLowerCase()) : true;
      return byCat && byQ;
    });
  }, [products, categoryId, q]);

  // Автоматически устанавливаем employeeId для обычных сотрудников
  useEffect(() => {
    if (isRegularEmployee && myEmployeeId && !employeeId) {
      setEmployeeId(myEmployeeId);
    } else if (!employeeId && employeeOptions?.[0]) {
      setEmployeeId(employeeOptions[0].id);
    }
  }, [employeeOptions, myEmployeeId, isRegularEmployee, employeeId]);
  useEffect(() => { if (!productId && products?.[0]) setProductId(products[0].id); }, [products]);
  
  // Reset productId when filters change if current product is not in filtered list
  useEffect(() => {
    if (filteredProducts.length > 0 && productId) {
      const isCurrentProductInFiltered = filteredProducts.some(p => p.id === productId);
      if (!isCurrentProductInFiltered) {
        setProductId(filteredProducts[0].id);
      }
    }
  }, [categoryId, q, filteredProducts, productId]);

  const selectedProduct = useMemo(() => {
    return filteredProducts.find(p => p.id === productId);
  }, [filteredProducts, productId]);

  const add = async () => {
    await fetch("/api/debts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ employeeId, productId, quantity: Number(quantity), date }) });
    showSuccess("Долг добавлен!");
    setQuantity("1");
    mutate();
  };

  // Фильтруем долги по выбранному сотруднику (только для директоров и старших админов)
  const filteredDebts = useMemo(() => {
    if (!canCreateDebtsForAll || !filterByEmployee) return data ?? [];
    return (data ?? []).filter(d => d.employeeId === filterByEmployee);
  }, [data, filterByEmployee, canCreateDebtsForAll]);

  // Подсчитываем общую сумму отфильтрованных долгов
  const totalAmount = useMemo(() => {
    return filteredDebts.reduce((sum, d) => sum + Number(d.amount), 0);
  }, [filteredDebts]);

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-red-500 to-red-600 bg-clip-text text-transparent">
          Долги
        </h1>
        {filterByEmployee && (
          <div className="px-4 py-2 bg-gradient-to-r from-red-500/20 to-red-600/20 border border-red-500/30 rounded-lg">
            <span className="text-sm text-gray-300">Общая сумма: </span>
            <span className="text-xl font-bold text-white">{totalAmount.toFixed(2)} ₽</span>
          </div>
        )}
      </div>

      {/* Кнопки для фильтрации по сотрудникам */}
      {canCreateDebtsForAll && (
        <div className="card p-4 bg-gradient-to-br from-gray-900/50 to-gray-800/50 border border-gray-700/50">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-white font-semibold text-sm mr-2 flex items-center gap-2">
              {NI && <NI.Filter className="w-4 h-4" />}
              Фильтр по сотруднику:
            </span>
            <button 
              onClick={() => setFilterByEmployee("")}
              className={`px-4 py-2 rounded-lg border transition-all text-sm font-medium ${
                filterByEmployee === "" 
                  ? "bg-gradient-to-r from-red-500 to-red-600 text-white border-red-500 shadow-lg shadow-red-500/20" 
                  : "border-gray-700 text-gray-300 hover:border-red-500/50 hover:bg-gray-800/50"
              }`}
            >
              Все
            </button>
            {(employees ?? []).map((emp) => (
              <button
                key={emp.id}
                onClick={() => setFilterByEmployee(emp.id)}
                className={`px-4 py-2 rounded-lg border transition-all text-sm font-medium ${
                  filterByEmployee === emp.id
                    ? "bg-gradient-to-r from-red-500 to-red-600 text-white border-red-500 shadow-lg shadow-red-500/20"
                    : "border-gray-700 text-gray-300 hover:border-red-500/50 hover:bg-gray-800/50"
                }`}
              >
                {emp.name}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Форма добавления долга */}
      <div className="card p-6 bg-gradient-to-br from-gray-900/50 to-gray-800/50 border border-gray-700/50">
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          {NI && <NI.Plus className="w-5 h-5 text-red-500" />}
          Добавить долг
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
              {NI && <NI.User className="w-4 h-4" />}
              Сотрудник
            </label>
            <select 
              value={employeeId} 
              onChange={(e) => setEmployeeId(e.target.value)} 
              disabled={!canCreateDebtsForAll}
              className="w-full border border-gray-700 rounded-lg px-4 py-2.5 bg-gray-900/50 text-white focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {employeeOptions.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
              {NI && <NI.Tag className="w-4 h-4" />}
              Категория
            </label>
            <select 
              value={categoryId} 
              onChange={(e) => setCategoryId(e.target.value)} 
              className="w-full border border-gray-700 rounded-lg px-4 py-2.5 bg-gray-900/50 text-white focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all"
            >
              <option value="">Все категории</option>
              {(categories ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
              {NI && <NI.Search className="w-4 h-4" />}
              Поиск товара
            </label>
            <input 
              placeholder="Введите название..." 
              value={q} 
              onChange={(e) => setQ(e.target.value)} 
              className="w-full border border-gray-700 rounded-lg px-4 py-2.5 bg-gray-900/50 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
              {NI && <NI.Box className="w-4 h-4" />}
              Товар
            </label>
            <select 
              value={productId} 
              onChange={(e) => setProductId(e.target.value)} 
              className="w-full border border-gray-700 rounded-lg px-4 py-2.5 bg-gray-900/50 text-white focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all"
            >
              {filteredProducts.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
              {NI && <NI.Hash className="w-4 h-4" />}
              Количество
            </label>
            <input 
              type="number" 
              value={quantity} 
              onChange={(e) => setQuantity(e.target.value)} 
              placeholder="1" 
              min="1"
              className="w-full border border-gray-700 rounded-lg px-4 py-2.5 bg-gray-900/50 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
              {NI && <NI.Calendar className="w-4 h-4" />}
              Дата
            </label>
            <input 
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)} 
              className="w-full border border-gray-700 rounded-lg px-4 py-2.5 bg-gray-900/50 text-white focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all"
            />
          </div>

          {selectedProduct && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                {NI && <NI.DollarSign className="w-4 h-4" />}
                Цена за единицу
              </label>
              <div className="w-full border border-gray-700 rounded-lg px-4 py-2.5 bg-gray-900/30 text-gray-400">
                {Number(selectedProduct.price).toFixed(2)} ₽
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
              {NI && <NI.Calculator className="w-4 h-4" />}
              Сумма
            </label>
            <div className="w-full border border-gray-700 rounded-lg px-4 py-2.5 bg-gradient-to-r from-red-500/20 to-red-600/20 border-red-500/30 text-white font-semibold">
              {selectedProduct ? (Number(selectedProduct.price) * Number(quantity || 0)).toFixed(2) : "0.00"} ₽
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button 
            className="btn-primary flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold shadow-lg shadow-red-500/20 transition-all transform hover:scale-105"
            onClick={add}
          >
            {NI ? <NI.Plus className="w-5 h-5" /> : "+"} 
            Добавить долг
          </button>
        </div>
      </div>

      {/* Список долгов */}
      <div className="card overflow-hidden border border-gray-700/50">
        <div className="p-4 bg-gradient-to-r from-gray-900/50 to-gray-800/50 border-b border-gray-700/50">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            {NI && <NI.List className="w-5 h-5 text-red-500" />}
            Список долгов
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="hidden sm:table-header-group bg-gray-900/30">
              <tr className="text-left border-b border-gray-700/50">
                <th className="p-4 text-white font-semibold">Сотрудник</th>
                <th className="p-4 text-white font-semibold">Товар</th>
                <th className="p-4 text-white font-semibold">Кол-во</th>
                <th className="p-4 text-white font-semibold">Дата</th>
                <th className="p-4 text-white font-semibold">Сумма</th>
                <th className="p-4 text-white font-semibold text-right">Действия</th>
              </tr>
            </thead>
            <tbody>
              {filteredDebts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400">
                    Нет долгов
                  </td>
                </tr>
              ) : (
                filteredDebts.map((d) => (
                  <>
                    <tr key={d.id} className="border-b border-gray-700/30 hidden sm:table-row hover:bg-gray-900/30 transition-colors">
                      <td className="p-4 text-white font-medium">{d.employee.name}</td>
                      <td className="p-4 text-gray-300">{d.product.name}</td>
                      <td className="p-4 text-gray-300">
                        <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs font-medium">
                          {d.quantity} шт
                        </span>
                      </td>
                      <td className="p-4 text-gray-300">{new Date(d.date).toLocaleDateString("ru-RU")}</td>
                      <td className="p-4 text-white font-semibold">{Number(d.amount).toFixed(2)} ₽</td>
                      <td className="p-4 text-right">
                        <button 
                          className="text-red-500 flex items-center gap-1 hover:text-red-400 transition-colors px-3 py-1 rounded hover:bg-red-500/10"
                          onClick={async () => { 
                            await fetch(`/api/debts/${d.id}`, { method: "DELETE" }); 
                            mutate(); 
                          }}
                        >
                          {NI ? <NI.Trash className="w-4 h-4" /> : "🗑️"} 
                          <span className="hidden lg:inline">Удалить</span>
                        </button>
                      </td>
                    </tr>
                    {/* Mobile view */}
                    <tr key={`${d.id}-mobile`} className="border-b border-gray-700/30 sm:hidden">
                      <td className="p-4">
                        <div className="space-y-3">
                          <div className="font-semibold text-white text-base">{d.product.name}</div>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="space-y-1">
                              <div className="text-gray-400 flex items-center gap-1">
                                {NI && <NI.User className="w-3 h-3" />}
                                Сотрудник
                              </div>
                              <div className="text-white">{d.employee.name}</div>
                            </div>
                            <div className="space-y-1">
                              <div className="text-gray-400 flex items-center gap-1">
                                {NI && <NI.Hash className="w-3 h-3" />}
                                Количество
                              </div>
                              <div className="text-white">
                                <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs font-medium">
                                  {d.quantity} шт
                                </span>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <div className="text-gray-400 flex items-center gap-1">
                                {NI && <NI.Calendar className="w-3 h-3" />}
                                Дата
                              </div>
                              <div className="text-white">{new Date(d.date).toLocaleDateString("ru-RU")}</div>
                            </div>
                            <div className="space-y-1">
                              <div className="text-gray-400 flex items-center gap-1">
                                {NI && <NI.DollarSign className="w-3 h-3" />}
                                Сумма
                              </div>
                              <div className="text-white font-semibold">{Number(d.amount).toFixed(2)} ₽</div>
                            </div>
                          </div>
                          <div className="pt-3 border-t border-gray-700/50">
                            <button 
                              className="text-red-500 flex items-center gap-2 hover:text-red-400 w-full justify-center transition-colors px-4 py-2 rounded hover:bg-red-500/10"
                              onClick={async () => { 
                                await fetch(`/api/debts/${d.id}`, { method: "DELETE" }); 
                                mutate(); 
                              }}
                            >
                              {NI ? <NI.Trash className="w-4 h-4" /> : "🗑️"} 
                              Удалить
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
