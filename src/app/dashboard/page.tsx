import Link from "next/link";
import { getAuth } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await getAuth();
  const user: any = (session as any)?.user;
  const role: string = user?.role || "EMPLOYEE";
  const visible = (key: string) => {
    switch (role) {
      case "DIRECTOR":
        return true;
      case "SENIOR_ADMIN":
        return ["employees","products","shortages"].includes(key) ? false : true;
      case "ADMIN":
        return ["employees","products","shortages"].includes(key) ? false : true;
      default:
        return key === "home";
    }
  };
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Добро пожаловать{user?.name ? `, ${user.name}` : ""}</h1>
        <p className="text-gray-600 text-sm">Управляйте сотрудниками, сменами, долгами, недостачами и зарплатами.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {visible("employees") && <Card href="/dashboard/employees" title="Сотрудники" desc="Добавление, редактирование и управление" />}
        {visible("shifts") && <Card href="/dashboard/shifts" title="Смены" desc="Назначение и контроль смен" />}
        {visible("products") && <Card href="/dashboard/products" title="Товары" desc="Управление товарами" />}
        {visible("debts") && <Card href="/dashboard/debts" title="Долги" desc="Учёт долгов сотрудников" />}
        {visible("shortages") && <Card href="/dashboard/shortages" title="Недостачи" desc="Фиксация и урегулирование недостач" />}
        {visible("salaries") && <Card href="/dashboard/salaries" title="Зарплаты" desc="Расчёт и утверждение выплат" />}
      </div>
      {role !== "DIRECTOR" && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded p-3">
          У вас права сотрудника. Некоторые действия доступны только для чтения.
        </p>
      )}
    </div>
  );
}

function Card({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <Link href={href} className="block rounded border bg-white p-4 hover:shadow">
      <div className="font-medium">{title}</div>
      <div className="text-sm text-gray-600">{desc}</div>
    </Link>
  );
}


