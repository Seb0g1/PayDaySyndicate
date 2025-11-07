"use client";
import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";
import { ErrorProvider } from "@/components/ErrorProvider";
import { LoadingProvider } from "@/components/LoadingProvider";
import { SidebarProvider } from "@/components/SidebarProvider";
import { SuccessProvider } from "@/components/SuccessProvider";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <SidebarProvider>
        <LoadingProvider>
          <ErrorProvider>
            <SuccessProvider>{children}</SuccessProvider>
          </ErrorProvider>
        </LoadingProvider>
      </SidebarProvider>
    </SessionProvider>
  );
}


