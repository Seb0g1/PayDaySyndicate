"use client";
import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";
import { ErrorProvider } from "@/components/ErrorProvider";
import { LoadingProvider } from "@/components/LoadingProvider";
import { SidebarProvider } from "@/components/SidebarProvider";
import { SuccessProvider } from "@/components/SuccessProvider";
import { SiteSettingsProvider } from "@/components/SiteSettingsProvider";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <SiteSettingsProvider>
        <SidebarProvider>
          <LoadingProvider>
            <ErrorProvider>
              <SuccessProvider>{children}</SuccessProvider>
            </ErrorProvider>
          </LoadingProvider>
        </SidebarProvider>
      </SiteSettingsProvider>
    </SessionProvider>
  );
}


