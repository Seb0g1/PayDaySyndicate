"use client";
import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";
import { ErrorProvider } from "@/components/ErrorProvider";
import { LoadingProvider } from "@/components/LoadingProvider";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <LoadingProvider>
        <ErrorProvider>{children}</ErrorProvider>
      </LoadingProvider>
    </SessionProvider>
  );
}


