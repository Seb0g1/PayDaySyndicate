"use client";
import useSWR from "swr";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useNextIcons } from "@/components/NI";

type Employee = { id: string; name: string };
type Product = { id: string; name: string; price: number; category?: string | null; categoryRef?: { id: string; name: string } | null };
type Category = { id: string; name: string };
type Debt = { id: string; employeeId: string; productId: string; quantity: number; date: string; amount: number; employee: Employee; product: Product };

const fetcher = (u: string) => fetch(u).then((r) => r.json());

export default function DebtsPage() {
  const NI = useNextIcons();
  const { data: session } = useSession();
  const role = ((session as any)?.user as any)?.role as string | undefined;
  const isDirector = role === "DIRECTOR";
  const { data: me } = useSWR<any>("/api/me", fetcher);
  const myEmployeeId = me?.employeeId as string | undefined;

  const { data: employees } = useSWR<Employee[]>("/api/employees", fetcher);
  const { data: products } = useSWR<Product[]>("/api/products", fetcher);
  const { data: categories } = useSWR<Category[]>("/api/categories", fetcher);
  const { data, mutate } = useSWR<Debt[]>(isDirector ? "/api/debts" : (myEmployeeId ? `/api/debts?employeeId=${myEmployeeId}` : null), fetcher);
  const [employeeId, setEmployeeId] = useState("");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [q, setQ] = useState("");
  const [categoryId, setCategoryId] = useState("");

  const employeeOptions = useMemo(() => {
    if (isDirector) return employees ?? [];
    return (employees ?? []).filter((e) => e.id === myEmployeeId);
  }, [employees, isDirector, myEmployeeId]);

  useEffect(() => { if (!employeeId && employeeOptions?.[0]) setEmployeeId(employeeOptions[0].id); }, [employeeOptions]);
  useEffect(() => { if (!productId && products?.[0]) setProductId(products[0].id); }, [products]);

  const add = async () => {
    await fetch("/api/debts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ employeeId, productId, quantity: Number(quantity), date }) });
    setQuantity("1");
    mutate();
  };

  const filteredProducts = (products ?? []).filter((p) => {
    const byCat = categoryId ? p.categoryRef?.id === categoryId : true;
    const byQ = q.trim() ? p.name.toLowerCase().includes(q.toLowerCase()) : true;
    return byCat && byQ;
  });

  return (
    <div className="space-y-4">
      <div className="card p-3 grid grid-cols-6 gap-2">
        <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className="border rounded px-2 py-1" disabled={!isDirector}>
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
        <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="border rounded px-2 py-1" />
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="border rounded px-2 py-1" />
        <button className="btn-primary flex items-center gap-1" onClick={add}>{NI ? <NI.Plus className="w-4 h-4" /> : "+"} Добавить</button>
      </div>
      <div className="card overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead><tr className="bg-gray-50 text-left"><th className="p-2">Сотрудник</th><th className="p-2">Товар</th><th className="p-2">Кол-во</th><th className="p-2">Дата</th><th className="p-2">Сумма</th><th className="p-2"></th></tr></thead>
          <tbody>
            {(data ?? []).map((d) => (
              <tr key={d.id} className="border-t">
                <td className="p-2">{d.employee.name}</td>
                <td className="p-2">{d.product.name}</td>
                <td className="p-2">{d.quantity}</td>
                <td className="p-2">{new Date(d.date).toLocaleDateString()}</td>
                <td className="p-2">{Number(d.amount).toFixed(2)}</td>
                <td className="p-2 text-right"><button className="text-red-600 flex items-center gap-1" onClick={async () => { await fetch(`/api/debts/${d.id}`, { method: "DELETE" }); mutate(); }}>{NI ? <NI.Trash className="w-4 h-4" /> : "🗑️"} Удалить</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


