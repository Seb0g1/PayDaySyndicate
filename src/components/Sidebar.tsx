"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { useSession, signOut } from "next-auth/react";
import { useNextIcons } from "@/components/NI";

type Role = "DIRECTOR" | "SENIOR_ADMIN" | "ADMIN" | "EMPLOYEE" | undefined;

const allLinks = [
  { href: "/dashboard", label: "Главная", key: "home", icon: "🏠" },
  { href: "/dashboard/employees", label: "Сотрудники", key: "employees", icon: "👥" },
  { href: "/dashboard/shifts", label: "Смены", key: "shifts", icon: "🗓️" },
  { href: "/dashboard/products", label: "Товары", key: "products", icon: "📦" },
  { href: "/dashboard/debts", label: "Долги", key: "debts", icon: "💳" },
  { href: "/dashboard/shortages", label: "Недостачи", key: "shortages", icon: "⚠️" },
  { href: "/dashboard/salaries", label: "Зарплаты", key: "salaries", icon: "💰" },
] as const;

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

export default function Sidebar() {
  const pathname = usePathname();
  const { data } = useSession();
  const role = ((data as any)?.user as any)?.role as Role;
  const allowed = new Set(visibleKeysByRole(role));
  const links = allLinks.filter((l) => allowed.has(l.key));
  const NI = useNextIcons();

  return (
    <aside className="hidden md:flex md:flex-col w-64 shrink-0 border-r" style={{ background: "#ffffffaa", backdropFilter: "blur(8px)" }}>
      <div className="px-4 py-4 flex items-center gap-2 border-b">
        <Image src="/logo.svg" width={28} height={28} alt="logo" />
        <div className="font-semibold">Syndicate App</div>
      </div>
      <nav className="p-3 space-y-1">
        {links.map((l) => {
          const active = pathname.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${active ? "bg-[#f6f8fc] border-[#e2e8f0] text-[#2563eb]" : "bg-white border-[#e2e8f0] text-[#0b1220] hover:bg-[#f6f8fc]"}`}
            >
              <span aria-hidden className="text-base" style={{ width: 20 }}>
                {NI ? (
                  l.key === "home" ? <NI.Home className="w-4 h-4" /> :
                  l.key === "employees" ? <NI.Users className="w-4 h-4" /> :
                  l.key === "shifts" ? <NI.Calendar className="w-4 h-4" /> :
                  l.key === "products" ? <NI.Box className="w-4 h-4" /> :
                  l.key === "debts" ? <NI.CreditCard className="w-4 h-4" /> :
                  l.key === "shortages" ? <NI.AlertTriangle className="w-4 h-4" /> :
                  l.key === "salaries" ? <NI.Wallet className="w-4 h-4" /> : null
                ) : l.icon}
              </span>
              <span>{l.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto p-3 border-t">
        <button onClick={() => signOut()} className="w-full btn-ghost">Выйти</button>
      </div>
    </aside>
  );
}


