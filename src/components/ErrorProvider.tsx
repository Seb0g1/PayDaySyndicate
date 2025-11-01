"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type Ctx = { showError: (message: string) => void };
const ErrorCtx = createContext<Ctx>({ showError: () => {} });

export function useError() {
  return useContext(ErrorCtx);
}

export function ErrorProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<string>("");

  const showError = useCallback((msg: string) => {
    setMessage(String(msg ?? "Ошибка"));
    setOpen(true);
  }, []);

  useEffect(() => {
    const origAlert = window.alert;
    (window as any)._origAlert = origAlert;
    window.alert = (msg?: any) => showError(String(msg ?? "Ошибка"));
    const onRejection = (e: PromiseRejectionEvent) => showError(e.reason?.message ?? String(e.reason ?? "Ошибка"));
    const onError = (e: ErrorEvent) => showError(e.message ?? "Ошибка");
    window.addEventListener("unhandledrejection", onRejection);
    window.addEventListener("error", onError);
    return () => {
      window.alert = origAlert;
      window.removeEventListener("unhandledrejection", onRejection);
      window.removeEventListener("error", onError);
    };
  }, [showError]);

  const value = useMemo(() => ({ showError }), [showError]);

  return (
    <ErrorCtx.Provider value={value}>
      {children}
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-lg bg-white shadow-xl border">
            <div className="px-4 py-3 border-b flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-white text-sm">!</span>
              <div className="font-medium">Ошибка</div>
            </div>
            <div className="px-4 py-4 text-sm text-gray-800 whitespace-pre-wrap">{message}</div>
            <div className="px-4 py-3 border-t text-right">
              <button className="rounded bg-black text-white px-3 py-1" onClick={() => setOpen(false)}>Ок</button>
            </div>
          </div>
        </div>
      )}
    </ErrorCtx.Provider>
  );
}


