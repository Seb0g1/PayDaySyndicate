"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import Image from "next/image";
import { useState } from "react";
import { useLoading } from "@/components/LoadingProvider";
import TabsNav from "@/components/TabsNav";

const allLinks = [
  { href: "/dashboard", label: "Главная", key: "home" },
  { href: "/dashboard/employees", label: "Сотрудники", key: "employees" },
  { href: "/dashboard/shifts", label: "Смены", key: "shifts" },
  { href: "/dashboard/products", label: "Товары", key: "products" },
  { href: "/dashboard/debts", label: "Долги", key: "debts" },
  { href: "/dashboard/shortages", label: "Недостачи", key: "shortages" },
  { href: "/dashboard/salaries", label: "Зарплаты", key: "salaries" },
  { href: "/dashboard/reports", label: "Отчёты", key: "reports" },
] as const;

type Role = "DIRECTOR" | "SENIOR_ADMIN" | "ADMIN" | "EMPLOYEE" | undefined;

function visibleKeysByRole(role: Role): readonly string[] {
  switch (role) {
    case "DIRECTOR":
      return allLinks.map((l) => l.key);
    case "SENIOR_ADMIN":
      return ["home", "shifts", "salaries", "debts", "reports"];
    case "ADMIN":
      return ["home", "shifts", "salaries", "debts", "reports"];
    case "EMPLOYEE":
    default:
      return ["home", "reports"];
  }
}

export function Nav() {
  const pathname = usePathname();
  const { data } = useSession();
  const role = ((data as any)?.user as any)?.role as Role;
  const allowed = new Set(visibleKeysByRole(role));
  const links = allLinks.filter((l) => allowed.has(l.key));
  const [open, setOpen] = useState(false);
  const { start } = useLoading();
  return (
    <header className="border-b-2 border-red-500 bg-black backdrop-blur shadow-[0_0_20px_rgba(255,0,0,0.3)]">
      <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-3">
        <button className="md:hidden rounded border-2 border-gray-800 bg-black text-white px-3 py-1 hover:border-red-500" onClick={() => setOpen(true)} aria-label="Открыть меню">☰</button>
        <Link href="/dashboard" className="flex items-center gap-2 font-bold text-lg">
          <div className="flex items-center justify-center w-7 h-7 border-2 border-red-500 bg-black">
            <div className="text-red-500 font-bold text-sm">PS</div>
          </div>
          <span className="text-white tracking-wider">PAYDAY SYNDICATE</span>
        </Link>
        <div className="ml-auto hidden md:block">
          <TabsNav tabs={links} />
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/80" />
          <aside className="absolute right-0 top-0 h-full w-72 bg-black shadow-[0_0_30px_rgba(255,0,0,0.5)] border-l-2 border-red-500 p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 font-bold">
                <div className="flex items-center justify-center w-6 h-6 border-2 border-red-500 bg-black">
                  <div className="text-red-500 font-bold text-xs">PS</div>
                </div>
                <span className="text-white tracking-wider">PAYDAY SYNDICATE</span>
              </div>
              <button className="rounded border-2 border-gray-800 bg-black text-white px-2 py-1 hover:border-red-500" onClick={() => setOpen(false)}>✕</button>
            </div>
            <nav>
              <TabsNav tabs={links} />
            </nav>
            <div className="mt-6 border-t-2 border-red-500 pt-3">
              <button onClick={() => signOut()} className="w-full rounded border-2 border-red-500 bg-black text-white px-3 py-2 font-bold hover:bg-red-600">ВЫЙТИ</button>
            </div>
          </aside>
        </div>
      )}
    </header>
  );
}


