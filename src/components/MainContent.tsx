"use client";
import { useSidebar } from "@/components/SidebarProvider";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import ChecklistGuard from "./ChecklistGuard";

export default function MainContent({ children }: { children: React.ReactNode }) {
  const { isCollapsed } = useSidebar();
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = ((session as any)?.user as any)?.role as string | undefined;
  
  // No margin on login page, different padding for mobile
  const marginClass = pathname === '/login' ? '' : isCollapsed ? 'md:ml-16' : 'md:ml-64';
  
  // Показываем чек-лист только для сотрудников (не директоров) и только на главной странице dashboard
  const showChecklist = role !== "DIRECTOR" && role !== "SENIOR_ADMIN" && pathname === "/dashboard";
  
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

