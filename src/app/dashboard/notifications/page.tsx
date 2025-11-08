"use client";
import { useState } from "react";
import { useNextIcons } from "@/components/NI";
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

export default function NotificationsPage() {
  const NI = useNextIcons();
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const { data: notifications, mutate } = useSWR<Notification[]>(
    `/api/notifications?unreadOnly=${filter === "unread"}&limit=100`,
    fetcher,
    {
      refreshInterval: 10000, // Обновляем каждые 10 секунд
    }
  );

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      await fetch(`/api/notifications/${notification.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read: true }),
      });
      mutate();
    }

    if (notification.link) {
      router.push(notification.link);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    await fetch(`/api/notifications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ read: true }),
    });
    mutate();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Удалить это уведомление?")) return;
    await fetch(`/api/notifications/${id}`, { method: "DELETE" });
    mutate();
  };

  const handleMarkAllAsRead = async () => {
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllAsRead: true }),
    });
    mutate();
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      report: "📊",
      shift: "🗓️",
      task: "✅",
      payment: "💰",
      penalty: "⚠️",
      bonus: "🎁",
      hookah: "💨",
      debt: "💳",
      shortage: "📦",
      checklist: "📋",
      memo: "📝",
      lost_item: "🔍",
    };
    return icons[type] || "🔔";
  };

  const filteredNotifications = notifications?.filter((n) =>
    filter === "all" ? true : !n.read
  ) || [];

  const unreadCount = notifications?.filter((n) => !n.read).length || 0;

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            {NI ? <NI.AlertTriangle className="w-6 h-6" /> : "🔔"} Уведомления
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilter(filter === "all" ? "unread" : "all")}
              className={`btn-ghost text-sm ${filter === "unread" ? "bg-white/10" : ""}`}
            >
              {filter === "all" ? "Все" : "Непрочитанные"} ({filter === "all" ? notifications?.length || 0 : unreadCount})
            </button>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="btn-ghost text-sm"
              >
                Отметить все как прочитанные
              </button>
            )}
          </div>
        </div>

        {filteredNotifications.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            {filter === "unread" ? "Нет непрочитанных уведомлений" : "Нет уведомлений"}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 rounded-lg border transition-all ${
                  notification.read
                    ? "bg-white/2 border-gray-700"
                    : "bg-white/5 border-gray-600"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="text-2xl flex-shrink-0">
                    {getTypeIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-white">
                            {notification.title}
                          </h3>
                          {!notification.read && (
                            <span className="w-2 h-2 bg-red-500 rounded-full" />
                          )}
                        </div>
                        <p className="text-sm text-gray-300 mb-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-gray-400">
                          <span>
                            {new Date(notification.createdAt).toLocaleString("ru-RU", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          {notification.employee && (
                            <span>Сотрудник: {notification.employee.name}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {!notification.read && (
                          <button
                            onClick={() => handleMarkAsRead(notification.id)}
                            className="text-xs text-gray-400 hover:text-white"
                            title="Отметить как прочитанное"
                          >
                            ✓
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(notification.id)}
                          className="text-xs text-red-400 hover:text-red-300"
                          title="Удалить"
                        >
                          {NI ? <NI.Trash className="w-4 h-4" /> : "🗑️"}
                        </button>
                      </div>
                    </div>
                    {notification.link && (
                      <button
                        onClick={() => handleNotificationClick(notification)}
                        className="mt-2 text-sm text-blue-400 hover:text-blue-300"
                      >
                        Перейти →
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

