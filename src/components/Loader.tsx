"use client";
import styles from "./Loader.module.css";

export default function Loader() {
  const styleVars: React.CSSProperties = {
    ["--size" as any]: "64px",
    ["--dot-size" as any]: "6px",
    ["--dot-count" as any]: 6 as any,
    ["--color" as any]: "var(--primary)",
    ["--speed" as any]: "1s",
    ["--spread" as any]: "60deg",
  };
  return (
    <div className={styles.overlay}>
      <div className={styles.dots} style={styleVars}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={styles.dot} style={{ ["--i" as any]: i as any }} />
        ))}
      </div>
    </div>
  );
}


