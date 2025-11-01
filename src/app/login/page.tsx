"use client";
import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import styles from "./Login.module.css";
import { useLoading } from "@/components/LoadingProvider";
import { useError } from "@/components/ErrorProvider";

export default function LoginPage() {
  const router = useRouter();
  const { start, stop } = useLoading();
  const { showError } = useError();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    start();
    const res = await signIn("credentials", { username, password, redirect: false });
    setLoading(false);
    if (res?.error) {
      stop();
      showError("Неверный логин или пароль");
      return;
    }
    router.push("/dashboard");
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <div className={styles.card2}>
          <form className={styles.form} onSubmit={onSubmit}>
            <div className={styles.avatar}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="8" r="4" stroke="#64748b" strokeWidth="1.5" />
                <path d="M4 20c0-4 4-6 8-6s8 2 8 6" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <p id="heading">Вход в учётную запись</p>
            <div className={styles.field}>
              <svg viewBox="0 0 16 16" fill="currentColor" height={16} width={16} xmlns="http://www.w3.org/2000/svg" className={styles.inputIcon}>
                <path d="M13.106 7.222c0-2.967-2.249-5.032-5.482-5.032-3.35 0-5.646 2.318-5.646 5.702 0 3.493 2.235 5.708 5.762 5.708.862 0 1.689-.123 2.304-.335v-.862c-.43.199-1.354.328-2.29.328-2.926 0-4.813-1.88-4.813-4.798 0-2.844 1.921-4.881 4.594-4.881 2.735 0 4.608 1.688 4.608 4.156 0 1.682-.554 2.769-1.416 2.769-.492 0-.772-.28-.772-.76V5.206H8.923v.834h-.11c-.266-.595-.881-.964-1.6-.964-1.4 0-2.378 1.162-2.378 2.823 0 1.737.957 2.906 2.379 2.906.8 0 1.415-.39 1.709-1.087h.11c.081.67.703 1.148 1.503 1.148 1.572 0 2.57-1.415 2.57-3.643zm-7.177.704c0-1.197.54-1.907 1.456-1.907.93 0 1.524.738 1.524 1.907S8.308 9.84 7.371 9.84c-.895 0-1.442-.725-1.442-1.914z" />
              </svg>
              <input className={styles.input} placeholder="Логин" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="off" />
            </div>
            <div className={styles.field}>
              <svg viewBox="0 0 16 16" fill="currentColor" height={16} width={16} xmlns="http://www.w3.org/2000/svg" className={styles.inputIcon}>
                <path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2zm3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" />
              </svg>
              <input className={styles.input} type="password" placeholder="Пароль" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div className={styles.btnRow}>
              <button className={`${styles.btn} ${styles.btnAccent}`} disabled={loading}>
                {loading ? "Входим..." : "Войти"}
              </button>
              <button type="button" className={styles.btn} onClick={() => signIn("google", { callbackUrl: "/dashboard" })}>Google</button>
            </div>
            <button type="button" className={`${styles.btn} ${styles.muted}`}>Забыли пароль</button>
          </form>
        </div>
      </div>
    </div>
  );
}


