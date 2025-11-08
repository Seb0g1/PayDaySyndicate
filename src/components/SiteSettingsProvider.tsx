"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import useSWR from "swr";

type SiteSettings = {
  id: string;
  siteName: string;
  siteIcon?: string | null;
  theme: "dark" | "light" | "blue" | "purple" | "green";
  enableEmployees: boolean;
  enableShifts: boolean;
  enableProducts: boolean;
  enableDebts: boolean;
  enableShortages: boolean;
  enableSalaries: boolean;
  enableReports: boolean;
  enableTasks: boolean;
  enableChecklist: boolean;
  enableLostItems: boolean;
  enableMemos: boolean;
  enablePayments: boolean;
  enablePcManagement: boolean;
  enableProductOrder: boolean;
  enableLangame: boolean;
  enableTelegram: boolean;
  // Настройки расчетного листа
  payslipShowStamp?: boolean;
  payslipBorderColor?: string;
  payslipWatermark?: string | null;
  payslipStampImage?: string | null;
};

const SiteSettingsContext = createContext<{
  settings: SiteSettings | null;
  isLoading: boolean;
  mutate: () => void;
}>({
  settings: null,
  isLoading: true,
  mutate: () => {},
});

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const { data: settings, isLoading, mutate } = useSWR<SiteSettings>(
    "/api/site-settings",
    fetcher
  );

  // Применяем тему к документу
  useEffect(() => {
    if (settings?.theme) {
      document.documentElement.setAttribute("data-theme", settings.theme);
    }
  }, [settings?.theme]);

  // Применяем название сайта
  useEffect(() => {
    if (settings?.siteName) {
      document.title = settings.siteName;
    }
  }, [settings?.siteName]);

  return (
    <SiteSettingsContext.Provider value={{ settings: settings || null, isLoading, mutate }}>
      {children}
    </SiteSettingsContext.Provider>
  );
}

export function useSiteSettings() {
  return useContext(SiteSettingsContext);
}

