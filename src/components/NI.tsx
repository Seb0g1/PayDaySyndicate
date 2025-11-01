"use client";
export function useNextIcons() {
  // Набор встраиваемых SVG (в стиле Heroicons/Lucide): без внешних зависимостей
  const S = {
    svg: (p: any, children: any) => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width={16} height={16} {...p}>{children}</svg>
    ),
  } as const;

  const C = {
    Home: (p: any) => S.svg(p, <path d="M3 11l9-7 9 7v8a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-4H9v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-8z" />),
    Users: (p: any) => S.svg(p, <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>),
    Calendar: (p: any) => S.svg(p, <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 11h18" />
    </>),
    Box: (p: any) => S.svg(p, <>
      <path d="M21 16V8a2 2 0 0 0-1-1.73L13 2.27a2 2 0 0 0-2 0L4 6.27A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <path d="M3.3 7L12 12l8.7-5" />
    </>),
    CreditCard: (p: any) => S.svg(p, <>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
    </>),
    AlertTriangle: (p: any) => S.svg(p, <>
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <path d="M12 9v4M12 17h.01" />
    </>),
    Wallet: (p: any) => S.svg(p, <>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M21 10h-6a2 2 0 1 0 0 4h6v-4z" />
    </>),
    Upload: (p: any) => S.svg(p, <>
      <path d="M4 17v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
      <path d="M7 9l5-5 5 5" />
      <path d="M12 4v12" />
    </>),
    Tag: (p: any) => S.svg(p, <>
      <path d="M20.59 13.41l-7.18 7.18a2 2 0 0 1-2.83 0L2 12V4h8l7.59 7.59a2 2 0 0 1 0 2.82z" />
      <circle cx="7.5" cy="7.5" r="1.5" />
    </>),
    Rows: (p: any) => S.svg(p, <>
      <rect x="3" y="5" width="18" height="4" rx="1" />
      <rect x="3" y="10" width="18" height="4" rx="1" />
      <rect x="3" y="15" width="18" height="4" rx="1" />
    </>),
    Edit: (p: any) => S.svg(p, <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </>),
    Trash: (p: any) => S.svg(p, <>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
    </>),
    Plus: (p: any) => S.svg(p, <path d="M12 5v14M5 12h14" />),
    Save: (p: any) => S.svg(p, <>
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <path d="M17 21v-8H7v8" />
      <path d="M7 3v5h8" />
    </>),
    Download: (p: any) => S.svg(p, <>
      <path d="M4 17v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
      <path d="M7 11l5 5 5-5" />
      <path d="M12 4v12" />
    </>),
    Refresh: (p: any) => S.svg(p, <>
      <path d="M21 12a9 9 0 1 1-3-6.7" />
      <polyline points="21 3 21 9 15 9" />
    </>),
  } as any;
  return C as any;
}


