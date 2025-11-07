"use client";

import { usePathname } from "next/navigation";
import "./globals.css";
import Providers from "./providers";
import Sidebar from "@/components/Sidebar";
import MainContent from "@/components/MainContent";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const showSidebar = pathname !== '/login';

  return (
    <html lang="ru">
      <head>
        <link rel="stylesheet" href="https://cdn.lineicons.com/5.0/lineicons.css" />
        <title>PayDay Syndicate</title>
      </head>
      <body className="antialiased min-h-dvh">
        <Providers>
          <div className="min-h-dvh flex">
            {showSidebar && <Sidebar />}
            <MainContent>{children}</MainContent>
          </div>
        </Providers>
      </body>
    </html>
  );
}
