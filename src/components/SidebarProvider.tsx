"use client";
import { createContext, useContext, useState, ReactNode } from "react";

type SidebarContext = {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
};

const SidebarCtx = createContext<SidebarContext>({
  isCollapsed: false,
  setIsCollapsed: () => {},
});

export function useSidebar() {
  return useContext(SidebarCtx);
}

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <SidebarCtx.Provider value={{ isCollapsed, setIsCollapsed }}>
      {children}
    </SidebarCtx.Provider>
  );
}

