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
    Minus: (p: any) => S.svg(p, <path d="M5 12h14" />),
    Check: (p: any) => S.svg(p, <polyline points="20 6 9 17 4 12" />),
    X: (p: any) => S.svg(p, <>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </>),
    Calculator: (p: any) => S.svg(p, <>
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <line x1="8" y1="6" x2="16" y2="6" />
      <line x1="8" y1="10" x2="16" y2="10" />
      <line x1="8" y1="14" x2="16" y2="14" />
      <line x1="8" y1="18" x2="12" y2="18" />
    </>),
    Menu: (p: any) => S.svg(p, <>
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </>),
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
    FileText: (p: any) => S.svg(p, <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
    </>),
    Search: (p: any) => S.svg(p, <>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </>),
    Monitor: (p: any) => S.svg(p, <>
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </>),
    Link: (p: any) => S.svg(p, <>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </>),
    RefreshCw: (p: any) => S.svg(p, <>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
      <path d="M17 3v4h4M17 7l-4-4" />
    </>),
    Play: (p: any) => S.svg(p, <polygon points="5 3 19 12 5 21 5 3" />),
    Stop: (p: any) => S.svg(p, <rect x="6" y="6" width="12" height="12" rx="1" />),
    Lock: (p: any) => S.svg(p, <>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </>),
    Unlock: (p: any) => S.svg(p, <>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 9.33-2.5" />
    </>),
    Power: (p: any) => S.svg(p, <>
      <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
      <line x1="12" y1="2" x2="12" y2="12" />
    </>),
    RotateCw: (p: any) => S.svg(p, <>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
      <path d="M17 3v4h4M17 7l-4-4" />
    </>),
    ChevronDown: (p: any) => S.svg(p, <>
      <path d="M6 9l6 6 6-6" />
    </>),
    ChevronRight: (p: any) => S.svg(p, <>
      <path d="M9 6l6 6-6 6" />
    </>),
    ShoppingCart: (p: any) => S.svg(p, <>
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </>),
    Moon: (p: any) => S.svg(p, <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />),
    Sun: (p: any) => S.svg(p, <>
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </>),
    Palette: (p: any) => S.svg(p, <>
      <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
      <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
      <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
      <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
    </>),
    Droplet: (p: any) => S.svg(p, <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />),
    Sparkles: (p: any) => S.svg(p, <>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
      <circle cx="12" cy="12" r="3" />
    </>),
    Bell: (p: any) => S.svg(p, <>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </>),
    Filter: (p: any) => S.svg(p, <>
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </>),
    User: (p: any) => S.svg(p, <>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </>),
    Hash: (p: any) => S.svg(p, <>
      <line x1="4" y1="9" x2="20" y2="9" />
      <line x1="4" y1="15" x2="20" y2="15" />
      <line x1="10" y1="3" x2="8" y2="21" />
      <line x1="16" y1="3" x2="14" y2="21" />
    </>),
    DollarSign: (p: any) => S.svg(p, <>
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </>),
    List: (p: any) => S.svg(p, <>
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </>),
    Eye: (p: any) => S.svg(p, <>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </>),
  } as any;
  return C as any;
}


