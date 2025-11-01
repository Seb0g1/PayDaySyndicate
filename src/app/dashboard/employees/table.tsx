"use client";
import useSWR from "swr";
import { useMemo, useState } from "react";
import { useNextIcons } from "@/components/NI";

type Employee = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  hireDate: string;
  payRate: number | string;
  payUnit: "HOURLY" | "DAILY";
  role: "CASHIER" | "MANAGER" | "STOCKER" | "OTHER";
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function EmployeesClient() {
  const NI = useNextIcons();
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const { data, mutate, isLoading } = useSWR<Employee[]>(`/api/employees?q=${encodeURIComponent(q)}&role=${role}`, fetcher);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);

  const list = useMemo(() => data ?? [], [data]);

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-2">
        <div>
          <label className="block text-xs text-gray-500">Поиск</label>
          <input value={q} onChange={(e) => setQ(e.target.value)} className="border rounded px-2 py-1" placeholder="Имя или эл. почта" />
        </div>
        <div>
          <label className="block text-xs text-gray-500">Роль</label>
          <select value={role} onChange={(e) => setRole(e.target.value)} className="border rounded px-2 py-1">
            <option value="">Все</option>
            <option>CASHIER</option>
            <option>MANAGER</option>
            <option>STOCKER</option>
            <option>OTHER</option>
          </select>
        </div>
        <div className="flex-1" />
        <button onClick={() => { setEditing(null); setShowForm(true); }} className="btn-primary">Добавить сотрудника</button>
      </div>

      <div className="overflow-x-auto bg-white rounded border">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left">
              <th className="p-2">Имя</th>
              <th className="p-2">Эл. почта</th>
              <th className="p-2">Телефон</th>
              <th className="p-2">Дата приёма</th>
              <th className="p-2">Ставка</th>
              <th className="p-2">Роль</th>
              <th className="p-2">Действия</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td className="p-3" colSpan={7}>Loading...</td></tr>
            )}
            {!isLoading && list.map((e) => (
              <tr key={e.id} className="border-t">
                <td className="p-2 font-medium">{e.name}</td>
                <td className="p-2">{e.email ?? ""}</td>
                <td className="p-2">{e.phone ?? ""}</td>
                <td className="p-2">{new Date(e.hireDate).toLocaleDateString()}</td>
                <td className="p-2">{Number(e.payRate).toFixed(2)} ₽/день</td>
                <td className="p-2">{e.role}</td>
                <td className="p-2 flex gap-2">
                  <a className="btn-ghost flex items-center gap-1" href={`/dashboard/employees/${e.id}/shifts`}>{NI ? <NI.Calendar className="w-4 h-4" /> : "🗓️"} <span>Смены</span></a>
                  <a className="btn-ghost flex items-center gap-1" href={`/dashboard/employees/${e.id}/salary`}>{NI ? <NI.Wallet className="w-4 h-4" /> : "💰"} <span>Зарплата</span></a>
                  <button className="btn-ghost" onClick={() => { setEditing(e); setShowForm(true); }}>Изменить</button>
                  <button className="btn-ghost" style={{ color: "#b91c1c", borderColor: "#fecaca" }} onClick={async () => { if (!confirm("Удалить сотрудника?")) return; await fetch(`/api/employees/${e.id}`, { method: "DELETE" }); mutate(); }}>Удалить</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <EmployeeForm
          initial={editing ?? undefined}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); mutate(); }}
        />
      )}
    </div>
  );
}

function EmployeeForm({ initial, onClose, onSaved }: { initial?: Employee; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [hireDate, setHireDate] = useState(initial ? new Date(initial.hireDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10));
  const [payRate, setPayRate] = useState(String(initial?.payRate ?? ""));
  const [payUnit, setPayUnit] = useState<Employee["payUnit"]>(initial?.payUnit ?? "DAILY");
  const [role, setRole] = useState<Employee["role"]>(initial?.role ?? "OTHER");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = { name, email, phone, hireDate, payRate: Number(payRate), payUnit, role };
      const res = await fetch(initial ? `/api/employees/${initial.id}` : "/api/employees", {
        method: initial ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      onSaved();
    } catch (e: any) {
      setError(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded shadow max-w-lg w-full p-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">{initial ? "Редактировать сотрудника" : "Добавить сотрудника"}</h2>
          <button onClick={onClose}>×</button>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div className="col-span-2">
            <label className="block text-xs text-gray-500">Имя</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="border rounded px-2 py-1 w-full" />
          </div>
          <div>
            <label className="block text-xs text-gray-500">Эл. почта</label>
            <input value={email ?? ""} onChange={(e) => setEmail(e.target.value)} className="border rounded px-2 py-1 w-full" />
          </div>
          <div>
            <label className="block text-xs text-gray-500">Телефон</label>
            <input value={phone ?? ""} onChange={(e) => setPhone(e.target.value)} className="border rounded px-2 py-1 w-full" />
          </div>
          <div>
            <label className="block text-xs text-gray-500">Дата приёма</label>
            <input type="date" value={hireDate} onChange={(e) => setHireDate(e.target.value)} className="border rounded px-2 py-1 w-full" />
          </div>
          <div>
            <label className="block text-xs text-gray-500">Ставка</label>
            <input type="number" step="0.01" value={payRate} onChange={(e) => setPayRate(e.target.value)} className="border rounded px-2 py-1 w-full" />
          </div>
          <div>
            <label className="block text-xs text-gray-500">Ед. оплаты</label>
            <select value={payUnit} onChange={(e) => setPayUnit(e.target.value as any)} className="border rounded px-2 py-1 w-full">
              <option>DAILY</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500">Роль</label>
            <select value={role} onChange={(e) => setRole(e.target.value as any)} className="border rounded px-2 py-1 w-full">
              <option>CASHIER</option>
              <option>MANAGER</option>
              <option>STOCKER</option>
              <option>OTHER</option>
            </select>
          </div>
        </div>
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button className="px-3 py-2" onClick={onClose}>Отмена</button>
          <button className="btn-primary" disabled={saving} onClick={submit}>{saving ? "Сохраняем..." : "Сохранить"}</button>
        </div>
      </div>
    </div>
  );
}


