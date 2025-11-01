"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      if (!res.ok) throw new Error(await res.text());
      router.push("/login");
    } catch (err: any) {
      setError(err.message || "Ошибка регистрации");
    } finally {
      setLoading(false);
    }
  };

  const allow = process.env.NEXT_PUBLIC_ALLOW_REGISTRATION ?? process.env.ALLOW_REGISTRATION;

  if (allow !== "true") {
    return (
      <div className="max-w-md mx-auto bg-white rounded-lg shadow p-6 mt-10">
        <p className="text-sm">Регистрация отключена.</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow p-6 mt-10">
      <h1 className="text-xl font-semibold mb-4">Создать аккаунт администратора</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label className="block text-sm text-gray-700">Имя</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded border px-3 py-2" required />
        </div>
        <div>
          <label className="block text-sm text-gray-700">Эл. почта</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded border px-3 py-2" required />
        </div>
        <div>
          <label className="block text-sm text-gray-700">Пароль</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full rounded border px-3 py-2" required />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button disabled={loading} className="w-full rounded bg-blue-600 text-white py-2 hover:bg-blue-700 disabled:opacity-60">{loading ? "Создаём..." : "Зарегистрировать"}</button>
      </form>
    </div>
  );
}


