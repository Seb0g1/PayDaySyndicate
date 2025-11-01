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
] as const;

type Role = "DIRECTOR" | "SENIOR_ADMIN" | "ADMIN" | "EMPLOYEE" | undefined;

function visibleKeysByRole(role: Role): readonly string[] {
  switch (role) {
    case "DIRECTOR":
      return allLinks.map((l) => l.key);
    case "SENIOR_ADMIN":
      return ["home", "shifts", "salaries", "debts"];
    case "ADMIN":
      return ["home", "shifts", "salaries", "debts"];
    case "EMPLOYEE":
    default:
      return ["home"];
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
    <header className="border-b border-[#d3e3ff] bg-white/80 backdrop-blur shadow-[0_10px_30px_rgba(24,94,224,.08)]">
      <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-3">
        <button className="md:hidden rounded border px-3 py-1" onClick={() => setOpen(true)} aria-label="Открыть меню">☰</button>
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-lg">
          <Image src="/logo.svg" width={28} height={28} alt="logo" />
          <span>Syndicate App</span>
        </Link>
        <div className="ml-auto hidden md:block">
          <TabsNav tabs={links} />
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/30" />
          <aside className="absolute right-0 top-0 h-full w-72 bg-white shadow-xl border-l p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 font-semibold">
                <Image src="/logo.svg" width={24} height={24} alt="logo" />
                <span>Syndicate App</span>
              </div>
              <button className="rounded border px-2 py-1" onClick={() => setOpen(false)}>✕</button>
            </div>
            <nav>
              <TabsNav tabs={links} />
            </nav>
            <div className="mt-6 border-t pt-3">
              <button onClick={() => signOut()} className="w-full rounded bg-black text-white px-3 py-2">Выйти</button>
            </div>
          </aside>
        </div>
      )}
    </header>
  );
}


