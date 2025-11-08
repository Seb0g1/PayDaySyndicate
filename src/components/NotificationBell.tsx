"use client";
import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useNextIcons } from "./NI";
import { useRouter } from "next/navigation";
import useSWR from "swr";

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string | null;
  read: boolean;
  soundPlayed: boolean;
  createdAt: string;
  employee?: { id: string; name: string } | null;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function NotificationBell() {
  const { data: session } = useSession();
  const NI = useNextIcons();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const bellRef = useRef<HTMLDivElement>(null);

  const userId = ((session as any)?.user as any)?.id;
  
  // Получаем уведомления
  const { data: notifications, mutate } = useSWR<Notification[]>(
    userId ? "/api/notifications?unreadOnly=true&limit=20" : null,
    fetcher,
    {
      refreshInterval: 5000, // Обновляем каждые 5 секунд
    }
  );

  const unreadCount = notifications?.filter((n) => !n.read).length || 0;
  const unreadNotifications = notifications?.filter((n) => !n.read) || [];

  // Воспроизводим звук для новых уведомлений
  useEffect(() => {
    if (!notifications || !soundEnabled || !userId) return;

    const unreadUnplayed = notifications.filter(
      (n) => !n.read && !n.soundPlayed
    );

    if (unreadUnplayed.length > 0) {
      // Воспроизводим звук
      playNotificationSound();

      // Помечаем уведомления как воспроизведенные
      unreadUnplayed.forEach((n) => {
        fetch(`/api/notifications/${n.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ soundPlayed: true }),
        }).catch(console.error);
      });
    }
  }, [notifications, soundEnabled, userId]);

  const playNotificationSound = () => {
    try {
      // Создаем звук уведомления программно
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = "sine";

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.error("Error playing notification sound:", error);
    }
  };

  // Закрываем меню при клике вне его
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleNotificationClick = async (notification: Notification) => {
    // Помечаем уведомление как прочитанное
    if (!notification.read) {
      await fetch(`/api/notifications/${notification.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read: true }),
      });
      mutate();
    }

    // Переходим по ссылке, если она есть
    if (notification.link) {
      router.push(notification.link);
    }

    setIsOpen(false);
  };

  const handleMarkAllAsRead = async () => {
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllAsRead: true }),
    });
    mutate();
  };

  if (!userId) return null;

  return (
    <div className="relative" ref={bellRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-white/10 transition-all text-white flex items-center justify-center"
        aria-label="Уведомления"
        title="Уведомления"
      >
        {NI ? (
          <NI.Bell className="w-5 h-5" />
        ) : (
          <span className="text-2xl">🔔</span>
        )}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center border-2 border-black">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute left-full ml-2 bottom-0 w-80 sm:w-96 bg-black border border-gray-700 rounded-lg shadow-xl z-50 max-h-96 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-700 flex items-center justify-between">
            <h3 className="font-semibold text-white">Уведомления</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`p-1 rounded ${soundEnabled ? "text-yellow-400" : "text-gray-500"}`}
                title={soundEnabled ? "Звук включен" : "Звук выключен"}
              >
                {soundEnabled ? "🔊" : "🔇"}
              </button>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-xs text-gray-400 hover:text-white"
                >
                  Отметить все как прочитанные
                </button>
              )}
            </div>
          </div>

          <div className="overflow-y-auto flex-1">
            {unreadNotifications.length === 0 ? (
              <div className="p-4 text-center text-gray-400 text-sm">
                Нет новых уведомлений
              </div>
            ) : (
              <div className="divide-y divide-gray-700">
                {unreadNotifications.map((notification) => (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className="w-full text-left p-4 hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        {notification.type === "report" && "📊"}
                        {notification.type === "shift" && "🗓️"}
                        {notification.type === "task" && "✅"}
                        {notification.type === "payment" && "💰"}
                        {notification.type === "penalty" && "⚠️"}
                        {notification.type === "bonus" && "🎁"}
                        {notification.type === "hookah" && "💨"}
                        {notification.type === "debt" && "💳"}
                        {notification.type === "shortage" && "📦"}
                        {notification.type === "checklist" && "📋"}
                        {notification.type === "memo" && "📝"}
                        {notification.type === "lost_item" && "🔍"}
                        {!["report", "shift", "task", "payment", "penalty", "bonus", "hookah", "debt", "shortage", "checklist", "memo", "lost_item"].includes(notification.type) && "🔔"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-white text-sm mb-1">
                          {notification.title}
                        </div>
                        <div className="text-xs text-gray-400 line-clamp-2">
                          {notification.message}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(notification.createdAt).toLocaleString("ru-RU", {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                      {!notification.read && (
                        <div className="flex-shrink-0 w-2 h-2 bg-red-500 rounded-full mt-2" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {unreadNotifications.length > 0 && (
            <div className="p-2 border-t border-gray-700">
              <button
                onClick={() => router.push("/dashboard/notifications")}
                className="w-full text-center text-sm text-gray-400 hover:text-white"
              >
                Показать все уведомления
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

