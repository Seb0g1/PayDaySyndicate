"use client";
import { useSidebar } from "@/components/SidebarProvider";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import ChecklistGuard from "./ChecklistGuard";

export default function MainContent({ children }: { children: React.ReactNode }) {
  const { isCollapsed } = useSidebar();
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = ((session as any)?.user as any)?.role as string | undefined;
  
  // Получаем информацию о пользователе, включая кастомную роль
  const [me, setMe] = useState<any>(null);
  useEffect(() => {
    if (pathname !== '/login') {
      fetch("/api/me")
        .then((r) => r.json())
        .then((data) => setMe(data))
        .catch(() => setMe(null));
    }
  }, [pathname]);
  
  // No margin on login page, different padding for mobile
  const marginClass = pathname === '/login' ? '' : isCollapsed ? 'md:ml-16' : 'md:ml-64';
  
  // Показываем чек-лист только для сотрудников (не директоров) и только на главной странице dashboard
  // DIRECTOR и OWNER не видят чек-лист, все остальные видят
  const isDirector = role === "DIRECTOR" || (role as any) === "OWNER";
  const showChecklist = !isDirector && pathname === "/dashboard";
  
  return (
    <main className={`flex-1 px-4 py-4 md:px-6 md:py-6 bg-black text-white transition-all duration-300 ${marginClass}`}>
      {showChecklist ? (
        <ChecklistGuard>{children}</ChecklistGuard>
      ) : (
        children
      )}
    </main>
  );
}

