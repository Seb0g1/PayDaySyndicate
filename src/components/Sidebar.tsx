"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { useSession, signOut } from "next-auth/react";
import { useNextIcons } from "@/components/NI";
import { useEffect, useState } from "react";
import { useSidebar } from "@/components/SidebarProvider";

type Role = "DIRECTOR" | "SENIOR_ADMIN" | "ADMIN" | "EMPLOYEE" | undefined;

type MenuItem = {
  href: string;
  label: string;
  key: string;
  icon: string;
  shortcut: string | null;
};

type MenuGroup = {
  label: string;
  key: string;
  icon: string;
  items: MenuItem[];
};

const allLinks: MenuItem[] = [
  { href: "/dashboard", label: "Главная", key: "home", icon: "🏠", shortcut: null },
  { href: "/dashboard/employees", label: "Сотрудники", key: "employees", icon: "👥", shortcut: "1" },
  { href: "/dashboard/shifts", label: "Смены", key: "shifts", icon: "🗓️", shortcut: "2" },
  { href: "/dashboard/products", label: "Товары", key: "products", icon: "📦", shortcut: "3" },
  { href: "/dashboard/product-order", label: "Заказ товаров", key: "productOrder", icon: "🛒", shortcut: null },
  { href: "/dashboard/debts", label: "Долги", key: "debts", icon: "💳", shortcut: "4" },
  { href: "/dashboard/shortages", label: "Недостачи", key: "shortages", icon: "⚠️", shortcut: "5" },
  { href: "/dashboard/salaries", label: "Зарплаты", key: "salaries", icon: "💰", shortcut: "6" },
  { href: "/dashboard/reports", label: "Отчёты", key: "reports", icon: "📊", shortcut: "7" },
  { href: "/dashboard/tasks", label: "Задачи", key: "tasks", icon: "📋", shortcut: null },
  { href: "/dashboard/memos", label: "Памятки", key: "memos", icon: "📝", shortcut: null },
  { href: "/dashboard/lost-items", label: "Забытые вещи", key: "lostItems", icon: "🔍", shortcut: null },
  { href: "/dashboard/checklist", label: "Чек-лист", key: "checklist", icon: "✅", shortcut: null },
  { href: "/dashboard/pc-management", label: "Управление ПК", key: "pcManagement", icon: "💻", shortcut: null },
  { href: "/dashboard/langame-settings", label: "Настройки Langame", key: "langameSettings", icon: "🔗", shortcut: null },
  { href: "/dashboard/telegram", label: "Telegram", key: "telegram", icon: "📱", shortcut: "8" },
  { href: "/dashboard/payments", label: "Выплаты", key: "payments", icon: "💸", shortcut: null },
  { href: "/dashboard/profile", label: "Профиль", key: "profile", icon: "👤", shortcut: null },
] as const;

// Группировка меню для Director и Senior Admin
const menuGroups: MenuGroup[] = [
  {
    label: "Управление персоналом",
    key: "personnel",
    icon: "users",
    items: [
      { href: "/dashboard/employees", label: "Сотрудники", key: "employees", icon: "users", shortcut: "1" },
      { href: "/dashboard/shifts", label: "Смены", key: "shifts", icon: "calendar", shortcut: "2" },
    ],
  },
  {
    label: "Товары",
    key: "products",
    icon: "box",
    items: [
      { href: "/dashboard/products", label: "Товары", key: "products", icon: "box", shortcut: "3" },
      { href: "/dashboard/product-order", label: "Заказ товаров", key: "productOrder", icon: "shoppingCart", shortcut: null },
      { href: "/dashboard/shortages", label: "Недостачи", key: "shortages", icon: "alertTriangle", shortcut: "5" },
    ],
  },
  {
    label: "Финансы",
    key: "finance",
    icon: "wallet",
    items: [
      { href: "/dashboard/debts", label: "Долги", key: "debts", icon: "creditCard", shortcut: "4" },
      { href: "/dashboard/salaries", label: "Зарплаты", key: "salaries", icon: "wallet", shortcut: "6" },
      { href: "/dashboard/payments", label: "Выплаты", key: "payments", icon: "creditCard", shortcut: null },
    ],
  },
  {
    label: "Рабочие задачи",
    key: "work",
    icon: "fileText",
    items: [
      { href: "/dashboard/tasks", label: "Задачи", key: "tasks", icon: "fileText", shortcut: null },
      { href: "/dashboard/memos", label: "Памятки", key: "memos", icon: "fileText", shortcut: null },
      { href: "/dashboard/lost-items", label: "Забытые вещи", key: "lostItems", icon: "search", shortcut: null },
      { href: "/dashboard/checklist", label: "Чек-лист", key: "checklist", icon: "check", shortcut: null },
    ],
  },
  {
    label: "Настройки",
    key: "settings",
    icon: "monitor",
    items: [
      { href: "/dashboard/pc-management", label: "Управление ПК", key: "pcManagement", icon: "monitor", shortcut: null },
      { href: "/dashboard/langame-settings", label: "Настройки Langame", key: "langameSettings", icon: "link", shortcut: null },
      { href: "/dashboard/telegram", label: "Telegram", key: "telegram", icon: "link", shortcut: "8" },
    ],
  },
];

function visibleKeysByRole(role: Role): readonly string[] {
  switch (role) {
    case "DIRECTOR":
      return allLinks.map((l) => l.key);
    case "SENIOR_ADMIN":
      return ["home", "shifts", "salaries", "debts", "reports", "tasks", "memos", "lostItems", "pcManagement", "productOrder", "payments", "profile"];
    case "ADMIN":
      return ["home", "tasks", "memos", "lostItems", "reports", "profile"];
    case "EMPLOYEE":
    default:
      return ["home", "tasks", "memos", "lostItems", "reports", "profile"];
  }
}

function getIcon(key: string, NI: any) {
  if (!NI) return null;
  switch (key) {
    case "home": return <NI.Home className="w-4 h-4" />;
    case "employees": return <NI.Users className="w-4 h-4" />;
    case "shifts": return <NI.Calendar className="w-4 h-4" />;
    case "products": return <NI.Box className="w-4 h-4" />;
    case "debts": return <NI.CreditCard className="w-4 h-4" />;
    case "shortages": return <NI.AlertTriangle className="w-4 h-4" />;
    case "salaries": return <NI.Wallet className="w-4 h-4" />;
    case "reports": return <NI.FileText className="w-4 h-4" />;
    case "payments": return <NI.CreditCard className="w-4 h-4" />;
    case "tasks": return <NI.FileText className="w-4 h-4" />;
    case "memos": return <NI.FileText className="w-4 h-4" />;
    case "lostItems": return <NI.Search className="w-4 h-4" />;
    case "checklist": return <NI.Check className="w-4 h-4" />;
    case "pcManagement": return <NI.Monitor className="w-4 h-4" />;
    case "langameSettings": return <NI.Link className="w-4 h-4" />;
    case "productOrder": return NI.ShoppingCart ? <NI.ShoppingCart className="w-4 h-4" /> : <NI.Box className="w-4 h-4" />;
    case "profile": return <NI.Users className="w-4 h-4" />;
    case "users": return <NI.Users className="w-4 h-4" />;
    case "calendar": return <NI.Calendar className="w-4 h-4" />;
    case "box": return <NI.Box className="w-4 h-4" />;
    case "alertTriangle": return <NI.AlertTriangle className="w-4 h-4" />;
    case "wallet": return <NI.Wallet className="w-4 h-4" />;
    case "creditCard": return <NI.CreditCard className="w-4 h-4" />;
    case "fileText": return <NI.FileText className="w-4 h-4" />;
    case "search": return <NI.Search className="w-4 h-4" />;
    case "check": return <NI.Check className="w-4 h-4" />;
    case "monitor": return <NI.Monitor className="w-4 h-4" />;
    case "link": return <NI.Link className="w-4 h-4" />;
    case "shoppingCart": return NI.ShoppingCart ? <NI.ShoppingCart className="w-4 h-4" /> : <NI.Box className="w-4 h-4" />;
    default: return null;
  }
}

function getGroupIcon(iconKey: string, NI: any) {
  return getIcon(iconKey, NI);
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data } = useSession();
  const role = ((data as any)?.user as any)?.role as Role;
  const allowed = new Set(visibleKeysByRole(role));
  const links = allLinks.filter((l) => allowed.has(l.key));
  const NI = useNextIcons();
  const { isCollapsed, setIsCollapsed } = useSidebar();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Определяем, нужно ли группировать меню
  const shouldGroup = role === "DIRECTOR" || role === "SENIOR_ADMIN";
  
  // Фильтруем группы меню для текущей роли
  const filteredGroups = shouldGroup
    ? menuGroups.filter((group) =>
        group.items.some((item) => allowed.has(item.key))
      )
    : [];

  // Проверяем, есть ли активный пункт в группе
  const isGroupActive = (group: MenuGroup) => {
    return group.items.some((item) => pathname.startsWith(item.href));
  };

  // Автоматически раскрываем группы с активными пунктами
  useEffect(() => {
    if (shouldGroup) {
      const activeGroups = new Set<string>();
      filteredGroups.forEach((group) => {
        if (isGroupActive(group)) {
          activeGroups.add(group.key);
        }
      });
      setExpandedGroups(activeGroups);
    }
  }, [pathname, shouldGroup]);

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) {
        next.delete(groupKey);
      } else {
        next.add(groupKey);
      }
      return next;
    });
  };

  // Hotkeys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.location === KeyboardEvent.DOM_KEY_LOCATION_NUMPAD || e.code.startsWith('Numpad')) {
        let numpadKey = null;
        
        if (e.code === 'Numpad1' || e.key === '1') numpadKey = '1';
        else if (e.code === 'Numpad2' || e.key === '2') numpadKey = '2';
        else if (e.code === 'Numpad3' || e.key === '3') numpadKey = '3';
        else if (e.code === 'Numpad4' || e.key === '4') numpadKey = '4';
        else if (e.code === 'Numpad5' || e.key === '5') numpadKey = '5';
        else if (e.code === 'Numpad6' || e.key === '6') numpadKey = '6';
        else if (e.code === 'Numpad7' || e.key === '7') numpadKey = '7';
        else if (e.code === 'Numpad8' || e.key === '8') numpadKey = '8';
        
        if (numpadKey) {
          const link = allLinks.find((l) => l.shortcut === numpadKey);
          if (link && allowed.has(link.key)) {
            e.preventDefault();
            router.push(link.href);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [allowed, router]);

  const renderMenuItem = (item: MenuItem, isNested: boolean = false) => {
    const active = pathname.startsWith(item.href);
    const icon = typeof item.icon === 'string' && !item.icon.match(/[👥🗓️📦🛒⚠️💰💳💸📋📝🔍✅⚙️💻🔗📱🏠]/) 
      ? getIcon(item.icon, NI)
      : getIcon(item.key, NI);
    
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => setMobileMenuOpen(false)}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all ${
          active
            ? "bg-gradient-to-r from-red-500 to-red-600 border-red-500 text-white shadow-[0_0_12px_rgba(255,0,0,0.3)]"
            : "bg-transparent border-transparent text-gray-300 hover:border-red-500/30 hover:bg-red-500/10 hover:text-white"
        } ${isCollapsed ? 'justify-center' : ''} ${isNested ? 'ml-4' : ''}`}
        title={isCollapsed ? item.label : undefined}
      >
        <span aria-hidden className="text-base flex items-center justify-center" style={{ width: 20 }}>
          {icon}
        </span>
        {!isCollapsed && (
          <>
            <span className="font-medium flex-1">{item.label}</span>
            {item.shortcut && (
              <span className="text-xs text-gray-500 bg-gray-900/50 px-1.5 py-0.5 rounded border border-gray-700">
                N{item.shortcut}
              </span>
            )}
          </>
        )}
      </Link>
    );
  };

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="fixed top-4 left-4 z-50 md:hidden p-2 rounded-lg bg-gradient-to-r from-red-500 to-red-600 text-white"
        aria-label="Открыть меню"
      >
        {NI ? <NI.Menu className="w-6 h-6" /> : "☰"}
      </button>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/80 z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Mobile & Desktop */}
      <aside className={`flex flex-col fixed left-0 top-0 h-screen z-50 transition-transform duration-300 ${isCollapsed ? 'w-16' : 'w-64'} border-r ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`} style={{ background: "rgba(255, 255, 255, 0.02)", backdropFilter: "blur(20px)", borderColor: "rgba(255, 0, 0, 0.2)" }}>
        <div className="px-4 py-5 flex items-center gap-3 border-b" style={{ borderColor: "rgba(255, 0, 0, 0.2)" }}>
          {!isCollapsed && (
            <>
              <div className="flex items-center justify-center w-9 h-9 border border-red-500 rounded-lg bg-gradient-to-br from-red-500/20 to-red-900/20">
                <div className="text-red-500 font-bold text-sm">PS</div>
              </div>
              <div className="font-semibold text-white text-base">PAYDAY SYNDICATE</div>
            </>
          )}
          {isCollapsed && (
            <div className="flex items-center justify-center w-full">
              <div className="flex items-center justify-center w-9 h-9 border border-red-500 rounded-lg bg-gradient-to-br from-red-500/20 to-red-900/20">
                <div className="text-red-500 font-bold text-sm">PS</div>
              </div>
            </div>
          )}
          {/* Mobile close button */}
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="ml-auto md:hidden text-white hover:text-red-400"
          >
            ✕
          </button>
        </div>
        <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
          {/* Главная страница - всегда отдельно */}
          {allowed.has("home") && renderMenuItem(allLinks.find((l) => l.key === "home")!)}

          {shouldGroup ? (
            // Группированное меню для Director и Senior Admin
            <>
              {filteredGroups.map((group) => {
                const isExpanded = expandedGroups.has(group.key);
                const hasActive = isGroupActive(group);
                const visibleItems = group.items.filter((item) => allowed.has(item.key));

                if (visibleItems.length === 0) return null;

                return (
                  <div key={group.key} className="space-y-1">
                    <button
                      onClick={() => !isCollapsed && toggleGroup(group.key)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all ${
                        hasActive
                          ? "bg-red-500/20 border-red-500/50 text-white"
                          : "bg-transparent border-transparent text-gray-300 hover:border-red-500/30 hover:bg-red-500/10 hover:text-white"
                      } ${isCollapsed ? 'justify-center' : ''}`}
                      title={isCollapsed ? group.label : undefined}
                      disabled={isCollapsed}
                    >
                      <span aria-hidden className="text-base flex items-center justify-center" style={{ width: 20 }}>
                        {getGroupIcon(group.icon, NI)}
                      </span>
                      {!isCollapsed && (
                        <>
                          <span className="font-medium flex-1 text-left">{group.label}</span>
                          {NI ? (
                            <NI.ChevronDown
                              className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            />
                          ) : (
                            <span className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                              ▼
                            </span>
                          )}
                        </>
                      )}
                    </button>
                    {!isCollapsed && isExpanded && (
                      <div className="space-y-1 ml-2 border-l pl-2" style={{ borderColor: "rgba(255, 0, 0, 0.2)" }}>
                        {visibleItems.map((item) => renderMenuItem(item, true))}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Отчёты - отдельно */}
              {allowed.has("reports") && renderMenuItem(allLinks.find((l) => l.key === "reports")!)}

              {/* Профиль - отдельно */}
              {allowed.has("profile") && renderMenuItem(allLinks.find((l) => l.key === "profile")!)}
            </>
          ) : (
            // Простое меню для обычных сотрудников
            <>
              {links
                .filter((l) => l.key !== "home")
                .map((item) => renderMenuItem(item))}
            </>
          )}
        </nav>
        <div className="mt-auto p-3 border-t flex flex-col gap-2" style={{ borderColor: "rgba(255, 0, 0, 0.2)" }}>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="btn-ghost font-medium text-xs py-1 hidden md:block"
            title={isCollapsed ? 'Развернуть' : 'Свернуть'}
          >
            {isCollapsed ? '→' : '←'}
          </button>
          <button onClick={() => signOut()} className="w-full btn-ghost font-medium">Выйти</button>
        </div>
      </aside>
    </>
  );
}
