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
    <div className="space-y-4">
      {/* Кнопки для фильтрации по сотрудникам */}
      {canCreateDebtsForAll && (
        <div className="card p-3">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-white font-semibold text-sm mr-2">Фильтр по сотруднику:</span>
            <button 
              onClick={() => setFilterByEmployee("")}
              className={`px-2 sm:px-4 py-2 rounded border transition-all text-sm ${
                filterByEmployee === "" 
                  ? "bg-gradient-to-r from-red-500 to-red-600 text-white border-red-500" 
                  : "border-gray-700 text-gray-300 hover:border-red-500/50"
              }`}
            >
              Все
            </button>
            {(employees ?? []).map((emp) => (
              <button
                key={emp.id}
                onClick={() => setFilterByEmployee(emp.id)}
                className={`px-2 sm:px-4 py-2 rounded border transition-all text-sm ${
                  filterByEmployee === emp.id
                    ? "bg-gradient-to-r from-red-500 to-red-600 text-white border-red-500"
                    : "border-gray-700 text-gray-300 hover:border-red-500/50"
                }`}
              >
                {emp.name}
              </button>
            ))}
          </div>
          {filterByEmployee && (
            <div className="mt-3 text-white">
              <strong>Общая сумма: {totalAmount.toFixed(2)} ₽</strong>
            </div>
          )}
        </div>
      )}
      
      <div className="card p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2">
        <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className="border rounded px-2 py-1" disabled={!canCreateDebtsForAll}>
          {employeeOptions.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="border rounded px-2 py-1">
          <option value="">Все категории</option>
          {(categories ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input placeholder="Поиск товара" value={q} onChange={(e) => setQ(e.target.value)} className="border rounded px-2 py-1" />
        <select value={productId} onChange={(e) => setProductId(e.target.value)} className="border rounded px-2 py-1">
          {filteredProducts.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="border rounded px-2 py-1" placeholder="Кол-во" />
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="border rounded px-2 py-1" />
        <button className="btn-primary flex items-center justify-center gap-1" onClick={add}>{NI ? <NI.Plus className="w-4 h-4" /> : "+"} Добавить</button>
      </div>
      <div className="card overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="hidden sm:table-header-group"><tr className="text-left border-b" style={{ borderColor: "rgba(255, 0, 0, 0.2)" }}><th className="p-3 text-white font-semibold">Сотрудник</th><th className="p-3 text-white font-semibold">Товар</th><th className="p-3 text-white font-semibold">Кол-во</th><th className="p-3 text-white font-semibold">Дата</th><th className="p-3 text-white font-semibold">Сумма</th><th className="p-3 text-white font-semibold"></th></tr></thead>
          <tbody>
            {filteredDebts.map((d) => (
              <>
              <tr key={d.id} className="border-b hidden sm:table-row" style={{ borderColor: "rgba(255, 255, 255, 0.1)" }}>
                <td className="p-3 text-white">{d.employee.name}</td>
                <td className="p-3 text-gray-300">{d.product.name}</td>
                <td className="p-3 text-gray-300">{d.quantity}</td>
                <td className="p-3 text-gray-300">{new Date(d.date).toLocaleDateString("ru-RU")}</td>
                <td className="p-3 text-gray-300">{Number(d.amount).toFixed(2)}</td>
                <td className="p-3 text-right"><button className="text-red-500 flex items-center gap-1 hover:text-red-400" onClick={async () => { await fetch(`/api/debts/${d.id}`, { method: "DELETE" }); mutate(); }}>{NI ? <NI.Trash className="w-4 h-4" /> : "🗑️"} Удалить</button></td>
              </tr>
              {/* Mobile view */}
              <tr key={`${d.id}-mobile`} className="border-b sm:hidden" style={{ borderColor: "rgba(255, 255, 255, 0.1)" }}>
                <td className="p-3" colSpan={6}>
                  <div className="space-y-2">
                    <div className="font-medium text-white">{d.product.name}</div>
                    <div className="space-y-1 text-xs text-gray-400">
                      <div>👤 {d.employee.name}</div>
                      <div>📊 {d.quantity} шт</div>
                      <div>📅 {new Date(d.date).toLocaleDateString("ru-RU")}</div>
                      <div>💰 {Number(d.amount).toFixed(2)} ₽</div>
                    </div>
                    <div className="pt-2 border-t" style={{ borderColor: "rgba(255, 255, 255, 0.1)" }}>
                      <button className="text-red-500 flex items-center gap-1 hover:text-red-400 w-full justify-center" onClick={async () => { await fetch(`/api/debts/${d.id}`, { method: "DELETE" }); mutate(); }}>{NI ? <NI.Trash className="w-4 h-4" /> : "🗑️"} Удалить</button>
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


