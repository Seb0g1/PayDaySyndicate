import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import Sidebar from "@/components/Sidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Syndicate App",
  description: "Современная система управления сменами и зарплатами",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <head>
        <link rel="stylesheet" href="https://cdn.lineicons.com/5.0/lineicons.css" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50 min-h-dvh`}>
        <Providers>
          <div className="min-h-dvh flex">
            <Sidebar />
            <main className="flex-1 px-4 py-6">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
