"use client";
import useSWR from "swr";
import { useMemo, useState, useEffect } from "react";
import { useNextIcons } from "@/components/NI";
import { useSuccess } from "@/components/SuccessProvider";

type Employee = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  hireDate: string;
  payRate: number | string;
  payUnit: "HOURLY" | "DAILY";
  role: "CASHIER" | "MANAGER" | "STOCKER" | "OTHER";
  userRole?: "DIRECTOR" | "SENIOR_ADMIN" | "ADMIN" | "EMPLOYEE" | null;
  user?: {
    id: string;
    role: "DIRECTOR" | "SENIOR_ADMIN" | "ADMIN" | "EMPLOYEE";
  } | null;
  permissions?: Array<{
    id: string;
    permission: string;
    granted: boolean;
  }>;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function EmployeesClient() {
  const NI = useNextIcons();
  const [q, setQ] = useState("");
  const { data, mutate, isLoading } = useSWR<Employee[]>(`/api/employees?q=${encodeURIComponent(q)}`, fetcher);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [showPermissions, setShowPermissions] = useState<Employee | null>(null);

  const list = useMemo(() => data ?? [], [data]);

  return (
    <div className="space-y-4">
      {/* Filters and Add Button */}
      <div className="card p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2">
          <div className="flex-1">
            <label className="block text-xs mb-1" style={{ color: "rgba(255, 255, 255, 0.7)" }}>Поиск</label>
            <input value={q} onChange={(e) => setQ(e.target.value)} className="border rounded px-2 py-1 w-full" placeholder="Имя или эл. почта" />
          </div>
          <button onClick={() => { setEditing(null); setShowForm(true); }} className="btn-primary whitespace-nowrap">Добавить сотрудника</button>
        </div>
      </div>

      {/* Table */}
      <div className="card rounded overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="hidden sm:table-header-group">
            <tr className="text-left border-b" style={{ borderColor: "rgba(255, 0, 0, 0.2)" }}>
              <th className="p-3 text-white font-semibold">Имя</th>
              <th className="p-3 text-white font-semibold">Эл. почта</th>
              <th className="p-3 text-white font-semibold">Телефон</th>
              <th className="p-3 text-white font-semibold">Дата приёма</th>
              <th className="p-3 text-white font-semibold">Ставка</th>
              <th className="p-3 text-white font-semibold">Роль пользователя</th>
              <th className="p-3 text-white font-semibold">Действия</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td className="p-3 text-white" colSpan={6}>Загрузка...</td></tr>
            )}
            {!isLoading && list.map((e) => (
              <>
                {/* Desktop view */}
                <tr key={e.id} className="border-b hidden sm:table-row" style={{ borderColor: "rgba(255, 255, 255, 0.1)" }}>
                  <td className="p-3 font-medium text-white">{e.name}</td>
                  <td className="p-3 text-gray-300">{e.email ?? "—"}</td>
                  <td className="p-3 text-gray-300">{e.phone ?? "—"}</td>
                  <td className="p-3 text-gray-300">{new Date(e.hireDate).toLocaleDateString("ru-RU")}</td>
                  <td className="p-3 text-gray-300">{Number(e.payRate).toFixed(2)} ₽/день</td>
                  <td className="p-3 text-gray-300">
                    {(e as any)?.customRole?.nameRu || e.user?.role || e.userRole || "—"}
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-2">
                      <a className="btn-ghost flex items-center gap-1" href={`/dashboard/employees/${e.id}/shifts`}>{NI ? <NI.Calendar className="w-4 h-4" /> : "🗓️"} <span className="hidden md:inline">Смены</span></a>
                      <a className="btn-ghost flex items-center gap-1" href={`/dashboard/employees/${e.id}/salary`}>{NI ? <NI.Wallet className="w-4 h-4" /> : "💰"} <span className="hidden md:inline">Зарплата</span></a>
                      <button className="btn-ghost" onClick={() => { setEditing(e); setShowForm(true); }}>Изменить</button>
                      <button className="btn-ghost" onClick={async () => { const emp = await fetch(`/api/employees/${e.id}`).then(r => r.json()); setShowPermissions(emp); }}>Права</button>
                      <button className="btn-ghost border-red-500/50 text-red-500 hover:bg-red-500/10" onClick={async () => { if (!confirm("Удалить сотрудника?")) return; await fetch(`/api/employees/${e.id}`, { method: "DELETE" }); mutate(); }}>Удалить</button>
                    </div>
                  </td>
                </tr>
                {/* Mobile view */}
                <tr key={`${e.id}-mobile`} className="border-b sm:hidden" style={{ borderColor: "rgba(255, 255, 255, 0.1)" }}>
                  <td className="p-3" colSpan={7}>
                    <div className="space-y-3">
                      <div>
                        <div className="font-medium text-white text-base mb-2">{e.name}</div>
                        <div className="space-y-1 text-xs text-gray-400">
                          {e.email && <div>📧 {e.email}</div>}
                          {e.phone && <div>📱 {e.phone}</div>}
                          <div>📅 {new Date(e.hireDate).toLocaleDateString("ru-RU")}</div>
                          <div>💰 {Number(e.payRate).toFixed(2)} ₽/день</div>
                              <div>👤 Роль: {(e as any)?.customRole?.nameRu || e.user?.role || e.userRole || "—"}</div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 pt-2 border-t" style={{ borderColor: "rgba(255, 255, 255, 0.1)" }}>
                        <a className="btn-ghost flex items-center gap-1 flex-1" href={`/dashboard/employees/${e.id}/shifts`}>{NI ? <NI.Calendar className="w-4 h-4" /> : "🗓️"} Смены</a>
                        <a className="btn-ghost flex items-center gap-1 flex-1" href={`/dashboard/employees/${e.id}/salary`}>{NI ? <NI.Wallet className="w-4 h-4" /> : "💰"} Зарплата</a>
                        <button className="btn-ghost flex-1" onClick={() => { setEditing(e); setShowForm(true); }}>Изменить</button>
                        <button className="btn-ghost flex-1" onClick={async () => { const emp = await fetch(`/api/employees/${e.id}`).then(r => r.json()); setShowPermissions(emp); }}>Права</button>
                        <button className="btn-ghost border-red-500/50 text-red-500 hover:bg-red-500/10 flex-1" onClick={async () => { if (!confirm("Удалить сотрудника?")) return; await fetch(`/api/employees/${e.id}`, { method: "DELETE" }); mutate(); }}>Удалить</button>
                      </div>
                    </div>
                  </td>
                </tr>
              </>
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

      {showPermissions && (
        <PermissionsModal
          employee={showPermissions}
          onClose={() => setShowPermissions(null)}
          onSaved={() => { setShowPermissions(null); mutate(); }}
        />
      )}
    </div>
  );
}

function EmployeeForm({ initial, onClose, onSaved }: { initial?: Employee; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [telegramTag, setTelegramTag] = useState((initial as any)?.telegramTag ?? "");
  const [hireDate, setHireDate] = useState(initial ? new Date(initial.hireDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10));
  const [payRate, setPayRate] = useState(String(initial?.payRate ?? ""));
  const [payUnit, setPayUnit] = useState<Employee["payUnit"]>(initial?.payUnit ?? "DAILY");
  const [userRole, setUserRole] = useState<"DIRECTOR" | "">(
    initial?.user?.role === "DIRECTOR" ? "DIRECTOR" : initial?.userRole === "DIRECTOR" ? "DIRECTOR" : ""
  );
  const [customRoleId, setCustomRoleId] = useState<string>(
    (initial as any)?.customRole?.id || (initial as any)?.customRoleId || ""
  );
  const [roles, setRoles] = useState<any[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showSuccess } = useSuccess();

  // Загружаем роли при открытии формы
  useEffect(() => {
    const loadRoles = async () => {
      setLoadingRoles(true);
      try {
        const res = await fetch("/api/roles");
        if (res.ok) {
          const data = await res.json();
          setRoles(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error("Error loading roles:", error);
      } finally {
        setLoadingRoles(false);
      }
    };
    loadRoles();
  }, []);

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = { 
        name, 
        email, 
        phone, 
        telegramTag, 
        hireDate, 
        payRate: Number(payRate), 
        payUnit, 
        ...(userRole ? { userRole } : {}),
        customRoleId: customRoleId || undefined,
      };
      const res = await fetch(initial ? `/api/employees/${initial.id}` : "/api/employees", {
        method: initial ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      showSuccess(initial ? "Сотрудник обновлен!" : "Сотрудник добавлен!");
      setTimeout(() => onSaved(), 500);
    } catch (e: any) {
      setError(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0, 0, 0, 0.8)" }} onClick={onClose}>
      <div className="modal-panel max-w-lg w-full p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">{initial ? "Редактировать сотрудника" : "Добавить сотрудника"}</h2>
          <button className="text-white text-2xl hover:text-red-500 transition-colors" onClick={onClose}>×</button>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div className="col-span-2">
            <label className="block text-xs mb-1" style={{ color: "rgba(255, 255, 255, 0.7)" }}>Имя</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="border rounded px-2 py-1 w-full" />
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: "rgba(255, 255, 255, 0.7)" }}>Эл. почта</label>
            <input value={email ?? ""} onChange={(e) => setEmail(e.target.value)} className="border rounded px-2 py-1 w-full" />
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: "rgba(255, 255, 255, 0.7)" }}>Телефон</label>
            <input value={phone ?? ""} onChange={(e) => setPhone(e.target.value)} className="border rounded px-2 py-1 w-full" />
          </div>
          <div className="col-span-2">
            <label className="block text-xs mb-1" style={{ color: "rgba(255, 255, 255, 0.7)" }}>Telegram @username</label>
            <input value={telegramTag} onChange={(e) => setTelegramTag(e.target.value)} className="border rounded px-2 py-1 w-full" placeholder="@username" />
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: "rgba(255, 255, 255, 0.7)" }}>Дата приёма</label>
            <input type="date" value={hireDate} onChange={(e) => setHireDate(e.target.value)} className="border rounded px-2 py-1 w-full" />
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: "rgba(255, 255, 255, 0.7)" }}>Ставка</label>
            <input type="number" step="0.01" value={payRate} onChange={(e) => setPayRate(e.target.value)} className="border rounded px-2 py-1 w-full" />
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: "rgba(255, 255, 255, 0.7)" }}>Ед. оплаты</label>
            <select value={payUnit} onChange={(e) => setPayUnit(e.target.value as any)} className="border rounded px-2 py-1 w-full">
              <option>DAILY</option>
            </select>
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: "rgba(255, 255, 255, 0.7)" }}>Системная роль</label>
            <select value={userRole} onChange={(e) => setUserRole(e.target.value as any)} className="border rounded px-2 py-1 w-full">
              <option value="">Без роли</option>
              <option>DIRECTOR</option>
            </select>
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: "rgba(255, 255, 255, 0.7)" }}>Кастомная роль</label>
            <select 
              value={customRoleId} 
              onChange={(e) => setCustomRoleId(e.target.value)} 
              className="border rounded px-2 py-1 w-full"
              disabled={loadingRoles}
            >
              <option value="">Без роли</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.nameRu} ({role.name})
                </option>
              ))}
            </select>
          </div>
        </div>
        {error && <p className="text-sm mt-2" style={{ color: "#ef4444" }}>{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button className="btn-ghost px-3 py-2" onClick={onClose}>Отмена</button>
          <button className="btn-primary" disabled={saving} onClick={submit}>{saving ? "Сохраняем..." : "Сохранить"}</button>
        </div>
      </div>
    </div>
  );
}

function PermissionsModal({ employee, onClose, onSaved }: { employee: Employee; onClose: () => void; onSaved: () => void }) {
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const { showSuccess } = useSuccess();
  const NI = useNextIcons();

  // Список всех доступных прав
  const allPermissions = [
    { key: "view_salaries", label: "Просмотр зарплат" },
    { key: "edit_employees", label: "Редактирование сотрудников" },
    { key: "view_reports", label: "Просмотр отчетов" },
    { key: "edit_reports", label: "Редактирование отчетов" },
    { key: "view_shifts", label: "Просмотр смен" },
    { key: "edit_shifts", label: "Редактирование смен" },
    { key: "view_debts", label: "Просмотр долгов" },
    { key: "edit_debts", label: "Редактирование долгов" },
    { key: "view_shortages", label: "Просмотр недостач" },
    { key: "edit_shortages", label: "Редактирование недостач" },
    { key: "view_tasks", label: "Просмотр задач" },
    { key: "edit_tasks", label: "Редактирование задач" },
    { key: "view_products", label: "Просмотр товаров" },
    { key: "edit_products", label: "Редактирование товаров" },
    { key: "view_payments", label: "Просмотр выплат" },
    { key: "edit_payments", label: "Редактирование выплат" },
  ];

  // Загружаем права сотрудника
  useEffect(() => {
    const loadPermissions = async () => {
      try {
        const res = await fetch(`/api/employees/${employee.id}/permissions`);
        if (res.ok) {
          const data = await res.json();
          const perms: Record<string, boolean> = {};
          data.forEach((p: { permission: string; granted: boolean }) => {
            perms[p.permission] = p.granted;
          });
          setPermissions(perms);
        }
      } catch (error) {
        console.error("Error loading permissions:", error);
      }
    };
    loadPermissions();
  }, [employee.id]);

  const handleToggle = (permission: string) => {
    setPermissions((prev) => ({
      ...prev,
      [permission]: !prev[permission],
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Сохраняем все права
      for (const permission of allPermissions) {
        const granted = permissions[permission.key] ?? false;
        await fetch(`/api/employees/${employee.id}/permissions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            permission: permission.key,
            granted,
          }),
        });
      }
      showSuccess("Права сохранены!");
      onSaved();
    } catch (error) {
      alert("Ошибка при сохранении прав");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0, 0, 0, 0.8)" }} onClick={onClose}>
      <div className="modal-panel max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Права доступа: {employee.name}</h2>
          <button className="text-white text-2xl hover:text-red-500 transition-colors" onClick={onClose}>×</button>
        </div>
        
        <div className="space-y-3">
          {allPermissions.map((perm) => (
            <label
              key={perm.key}
              className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all hover:bg-white/5"
              style={{ borderColor: "rgba(255, 255, 255, 0.1)" }}
            >
              <input
                type="checkbox"
                checked={permissions[perm.key] ?? false}
                onChange={() => handleToggle(perm.key)}
                className="w-5 h-5 rounded border-gray-600"
              />
              <span className="text-white flex-1">{perm.label}</span>
            </label>
          ))}
        </div>

        <div className="mt-6 flex justify-end gap-2 pt-4 border-t" style={{ borderColor: "rgba(255, 255, 255, 0.1)" }}>
          <button className="btn-ghost px-3 py-2" onClick={onClose}>Отмена</button>
          <button className="btn-primary" disabled={saving} onClick={handleSave}>
            {saving ? "Сохраняем..." : "Сохранить"}
          </button>
        </div>
      </div>
    </div>
  );
}


