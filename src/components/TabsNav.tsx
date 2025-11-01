"use client";
import styles from "./TabsNav.module.css";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { useLoading } from "@/components/LoadingProvider";

type Tab = { href: string; label: string; key: string; badge?: number };

export default function TabsNav({ tabs }: { tabs: Tab[] }) {
  const pathname = usePathname();
  const activeIdx = (() => {
    let idx = 0;
    let bestLen = -1;
    tabs.forEach((t, i) => {
      if (pathname.startsWith(t.href) && t.href.length > bestLen) {
        bestLen = t.href.length;
        idx = i;
      }
    });
    return idx;
  })();
  const baseId = useId();
  const { start } = useLoading();
  const ref = useRef<HTMLDivElement>(null);
  const [glider, setGlider] = useState<{ left: number; width: number }>({ left: 0, width: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const labels = Array.from(el.querySelectorAll("label"));
    const target = labels[activeIdx] as HTMLElement | undefined;
    if (!target) return;
    const parentRect = el.getBoundingClientRect();
    const rect = target.getBoundingClientRect();
    setGlider({ left: rect.left - parentRect.left, width: rect.width });
  }, [activeIdx, tabs.length, pathname]);
  useEffect(() => {
    const onResize = () => {
      const el = ref.current;
      if (!el) return;
      const labels = Array.from(el.querySelectorAll("label"));
      const target = labels[activeIdx] as HTMLElement | undefined;
      if (!target) return;
      const parentRect = el.getBoundingClientRect();
      const rect = target.getBoundingClientRect();
      setGlider({ left: rect.left - parentRect.left, width: rect.width });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [activeIdx]);
  return (
    <div className={styles.wrap}>
      <div className={styles.tabs} ref={ref} style={{ ['--count' as any]: tabs.length }}>
        {tabs.map((t, i) => (
          <span key={t.href}>
            <input className={styles.radio} id={`${baseId}-${i}`} type="radio" name={`tabs-${baseId}`} checked={i === activeIdx} readOnly />
            <label className={styles.tab} htmlFor={`${baseId}-${i}`}>
              <Link href={t.href} onClick={() => start()}>{t.label}</Link>
              {typeof t.badge === 'number' ? <span className={styles.notification}>{t.badge}</span> : null}
            </label>
          </span>
        ))}
        <span className={styles.glider} style={{ left: glider.left, width: glider.width }} />
      </div>
    </div>
  );
}


