"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useLoading } from "@/components/LoadingProvider";

export default function Home() {
  const { data: session } = useSession();
  const router = useRouter();
  const [now, setNow] = useState(new Date());
  const { start } = useLoading();

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") go();
    };
    window.addEventListener("keydown", onKey);
    return () => { clearInterval(t); window.removeEventListener("keydown", onKey); };
  }, [session]);

  const go = () => {
    start();
    if ((session as any)?.user) router.push("/dashboard");
    else router.push("/login");
  };

  const pad = (n: number) => String(n).padStart(2, "0");
  const h = pad(now.getHours());
  const m = pad(now.getMinutes());
  const dayNames = ["Воскресенье","Понедельник","Вторник","Среда","Четверг","Пятница","Суббота"];
  const monthNames = ["Января","Февраля","Марта","Апреля","Мая","Июня","Июля","Августа","Сентября","Октября","Ноября","Декабря"];

  return (
    <div className="relative min-h-dvh text-black select-none" onClick={go}>
      <div className="absolute top-4 left-4 flex items-center gap-3 text-sm">
        <span className="inline-block h-3 w-3 rounded-full bg-red-600" />
        <span>Нажмите Enter для входа</span>
      </div>
      <div className="absolute bottom-6 left-6">
        <div className="text-[140px] leading-none font-semibold tracking-tight">{h}:{m}</div>
        <div className="mt-2 flex items-center gap-8 text-xs text-gray-300">
          <span>{dayNames[now.getDay()]}</span>
          <span>{now.getDate()} {monthNames[now.getMonth()]}</span>
          <span>UTC{Intl.DateTimeFormat().resolvedOptions().timeZone ? "" : ""}</span>
        </div>
      </div>
      <div className="absolute bottom-6 right-6 text-xs text-gray-400">Syndicate App</div>
    </div>
  );
}
