"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import Loader from "@/components/Loader";
import { usePathname } from "next/navigation";

type Ctx = { start: () => void; stop: () => void };
const C = createContext<Ctx>({ start: () => {}, stop: () => {} });

export function useLoading() { return useContext(C); }

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const pathname = usePathname();

  const start = useCallback(() => setVisible(true), []);
  const stop = useCallback(() => setVisible(false), []);

  useEffect(() => {
    if (!visible) return; // if already hidden nothing to do
    // small grace period to avoid flicker
    const t = setTimeout(() => setVisible(false), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const value = useMemo(() => ({ start, stop }), [start, stop]);
  return (
    <C.Provider value={value}>
      {children}
      {visible ? <Loader /> : null}
    </C.Provider>
  );
}


