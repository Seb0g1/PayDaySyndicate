"use client";
import { useState, useEffect } from "react";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import { useNextIcons } from "@/components/NI";
import { useSuccess } from "@/components/SuccessProvider";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Task = {
  id: string;
  title: string;
  description?: string | null;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  dueDate?: string | null;
  createdAt: string;
  assignedTo: { id: string; name: string; telegramTag?: string | null };
  createdBy: { id: string; name?: string | null };
};

type Employee = {
  id: string;
  name: string;
  telegramTag?: string | null;
};

export default function TasksPage() {
  const { data: session, status } = useSession();
  const role = ((session as any)?.user as any)?.role as string | undefined;
  const NI = useNextIcons();
  const { showSuccess } = useSuccess();

  // Показываем загрузку пока сессия загружается
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-white">Загрузка...</div>
      </div>
    );
  }

  const isDirector = role === "DIRECTOR";
  const { data: employees } = useSWR<Employee[]>(isDirector ? "/api/employees" : null, fetcher);
  const { data: tasks, mutate, isLoading } = useSWR<Task[]>(
    "/api/tasks",
    fetcher
  );

  const [showModal, setShowModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedToId, setAssignedToId] = useState("");
  const [priority, setPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "URGENT">("MEDIUM");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);

  // Форматируем дату с днем недели для отображения
  const formatDateWithWeekday = (dateString: string): string => {
    const date = new Date(dateString);
    const weekdays = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
    const weekday = weekdays[date.getDay()];
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${weekday} ${day}.${month}.${year}`;
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setAssignedToId("");
    setPriority("MEDIUM");
    setDueDate("");
    setSelectedTask(null);
    setSaving(false);
  };

  const handleCreate = async () => {
    if (!title || !assignedToId) {
      alert("Заполните название задачи и выберите сотрудника");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, assignedToId, priority, dueDate: dueDate || undefined }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Ошибка при создании задачи");
      }

      showSuccess("Задача создана!");
      mutate();
      setShowModal(false);
      resetForm();
    } catch (error: any) {
      alert(error.message || "Ошибка при создании задачи");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = async (taskId: string, newStatus: Task["status"]) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) throw new Error("Ошибка при обновлении задачи");

      showSuccess("Статус задачи обновлен!");
      mutate();
    } catch (error) {
      alert("Ошибка при обновлении задачи");
    }
  };

  const priorityColors: Record<string, string> = {
    LOW: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    MEDIUM: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    HIGH: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    URGENT: "bg-red-500/20 text-red-400 border-red-500/30",
  };

  const statusLabels: Record<string, string> = {
    PENDING: "Ожидает",
    IN_PROGRESS: "В работе",
    COMPLETED: "Выполнено",
    CANCELLED: "Отменено",
  };

  const statusColors: Record<string, string> = {
    PENDING: "bg-gray-500/20 text-gray-400 border-gray-500/30",
    IN_PROGRESS: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    COMPLETED: "bg-green-500/20 text-green-400 border-green-500/30",
    CANCELLED: "bg-red-500/20 text-red-400 border-red-500/30",
  };

  const priorityLabels: Record<string, string> = {
    LOW: "Низкий",
    MEDIUM: "Средний",
    HIGH: "Высокий",
    URGENT: "Срочно",
  };

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-red-500 to-red-600 bg-clip-text text-transparent">
          Задачи
        </h1>
        {isDirector && (
          <button 
            className="btn-primary flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold shadow-lg shadow-red-500/20 transition-all transform hover:scale-105"
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
          >
            {NI ? <NI.Plus className="w-5 h-5" /> : "+"} Создать задачу
          </button>
        )}
      </div>

      {/* Таблица задач */}
      <div className="card overflow-hidden border border-gray-700/50">
        <div className="p-4 bg-gradient-to-r from-gray-900/50 to-gray-800/50 border-b border-gray-700/50">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            {NI && <NI.List className="w-5 h-5 text-red-500" />}
            Список задач
          </h2>
        </div>
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-8 text-center text-gray-400">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
              <p className="mt-2">Загрузка задач...</p>
            </div>
          ) : !tasks || tasks.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <p>Задач пока нет.</p>
            </div>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="hidden lg:table-header-group bg-gray-900/30">
                <tr className="text-left border-b border-gray-700/50">
                  <th className="p-3 text-white font-semibold">Название</th>
                  <th className="p-3 text-white font-semibold">Сотрудник</th>
                  <th className="p-3 text-white font-semibold">Приоритет</th>
                  <th className="p-3 text-white font-semibold">Статус</th>
                  <th className="p-3 text-white font-semibold">Срок выполнения</th>
                  <th className="p-3 text-white font-semibold">Действия</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <>
                    {/* Desktop view */}
                    <tr key={task.id} className="border-b border-gray-700/30 hidden lg:table-row hover:bg-gray-800/30 transition-colors">
                      <td className="p-3">
                        <div className="font-medium text-white">{task.title}</div>
                        {task.description && (
                          <div className="text-xs text-gray-400 mt-1 line-clamp-2">{task.description}</div>
                        )}
                      </td>
                      <td className="p-3 text-gray-300">{task.assignedTo.name}</td>
                      <td className="p-3">
                        <span className={`px-3 py-1 rounded-lg border text-xs font-medium ${priorityColors[task.priority]}`}>
                          {priorityLabels[task.priority]}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`px-3 py-1 rounded-lg border text-xs font-medium ${statusColors[task.status]}`}>
                          {statusLabels[task.status]}
                        </span>
                      </td>
                      <td className="p-3 text-gray-300">
                        {task.dueDate ? formatDateWithWeekday(task.dueDate) : "-"}
                      </td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          {task.status !== "COMPLETED" && task.status !== "CANCELLED" && (
                            <>
                              {task.status === "PENDING" && (
                                <button
                                  className="px-3 py-1.5 rounded-lg border border-blue-500/50 text-blue-400 hover:bg-blue-500/10 transition-all text-xs font-medium"
                                  onClick={() => handleUpdateStatus(task.id, "IN_PROGRESS")}
                                >
                                  В работу
                                </button>
                              )}
                              {task.status === "IN_PROGRESS" && (
                                <button
                                  className="px-3 py-1.5 rounded-lg border border-green-500/50 text-green-400 hover:bg-green-500/10 transition-all text-xs font-medium"
                                  onClick={() => handleUpdateStatus(task.id, "COMPLETED")}
                                >
                                  Выполнено
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                    {/* Mobile view */}
                    <tr key={`${task.id}-mobile`} className="border-b border-gray-700/30 lg:hidden">
                      <td className="p-4">
                        <div className="space-y-3">
                          <div className="font-semibold text-white text-lg">{task.title}</div>
                          {task.description && (
                            <div className="text-sm text-gray-400">{task.description}</div>
                          )}
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="space-y-1">
                              <div className="text-xs text-gray-400">Сотрудник</div>
                              <div className="text-white">{task.assignedTo.name}</div>
                            </div>
                            <div className="space-y-1">
                              <div className="text-xs text-gray-400">Приоритет</div>
                              <span className={`inline-block px-2 py-1 rounded border text-xs ${priorityColors[task.priority]}`}>
                                {priorityLabels[task.priority]}
                              </span>
                            </div>
                            <div className="space-y-1">
                              <div className="text-xs text-gray-400">Статус</div>
                              <span className={`inline-block px-2 py-1 rounded border text-xs ${statusColors[task.status]}`}>
                                {statusLabels[task.status]}
                              </span>
                            </div>
                            <div className="space-y-1">
                              <div className="text-xs text-gray-400">Срок</div>
                              <div className="text-white text-xs">
                                {task.dueDate ? formatDateWithWeekday(task.dueDate) : "-"}
                              </div>
                            </div>
                          </div>
                          {task.status !== "COMPLETED" && task.status !== "CANCELLED" && (
                            <div className="flex gap-2 pt-2 border-t border-gray-700/50">
                              {task.status === "PENDING" && (
                                <button
                                  className="flex-1 px-4 py-2 rounded-lg border border-blue-500/50 text-blue-400 hover:bg-blue-500/10 transition-all text-sm font-medium"
                                  onClick={() => handleUpdateStatus(task.id, "IN_PROGRESS")}
                                >
                                  В работу
                                </button>
                              )}
                              {task.status === "IN_PROGRESS" && (
                                <button
                                  className="flex-1 px-4 py-2 rounded-lg border border-green-500/50 text-green-400 hover:bg-green-500/10 transition-all text-sm font-medium"
                                  onClick={() => handleUpdateStatus(task.id, "COMPLETED")}
                                >
                                  Выполнено
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  </>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Модальное окно создания задачи */}
      {showModal && isDirector && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0, 0, 0, 0.8)" }}
          onClick={() => {
            setShowModal(false);
            resetForm();
          }}
        >
          <div 
            className="modal-panel max-w-2xl w-full p-6 bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-white flex items-center gap-2">
                {NI && <NI.Plus className="w-6 h-6 text-red-500" />}
                Создать задачу
              </h2>
              <button
                className="text-white text-2xl hover:text-red-500 transition-colors p-1"
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
              >
                ×
              </button>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-white flex items-center gap-2">
                  {NI && <NI.Edit className="w-4 h-4" />}
                  Название задачи *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full border border-gray-700 rounded-lg px-4 py-2.5 bg-gray-900/50 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all"
                  placeholder="Введите название задачи"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-white flex items-center gap-2">
                  {NI && <NI.FileText className="w-4 h-4" />}
                  Описание
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full border border-gray-700 rounded-lg px-4 py-2.5 bg-gray-900/50 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all resize-none"
                  placeholder="Описание задачи (необязательно)"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-white flex items-center gap-2">
                  {NI && <NI.User className="w-4 h-4" />}
                  Сотрудник *
                </label>
                <select
                  value={assignedToId}
                  onChange={(e) => setAssignedToId(e.target.value)}
                  className="w-full border border-gray-700 rounded-lg px-4 py-2.5 bg-gray-900/50 text-white focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all"
                >
                  <option value="">Выберите сотрудника</option>
                  {(employees ?? []).map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-white flex items-center gap-2">
                  {NI && <NI.AlertTriangle className="w-4 h-4" />}
                  Приоритет
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full border border-gray-700 rounded-lg px-4 py-2.5 bg-gray-900/50 text-white focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all"
                >
                  <option value="LOW">Низкий</option>
                  <option value="MEDIUM">Средний</option>
                  <option value="HIGH">Высокий</option>
                  <option value="URGENT">Срочно</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-white flex items-center gap-2">
                  {NI && <NI.Calendar className="w-4 h-4" />}
                  Срок выполнения
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full border border-gray-700 rounded-lg px-4 py-2.5 bg-gray-900/50 text-white focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all"
                  min={new Date().toISOString().split('T')[0]}
                />
                {dueDate && (
                  <div className="mt-2 px-4 py-2 bg-gradient-to-r from-red-500/20 to-red-600/20 border border-red-500/30 rounded-lg">
                    <div className="text-xs text-gray-400 mb-1">Выбранная дата:</div>
                    <div className="text-white font-semibold">{formatDateWithWeekday(dueDate)}</div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-700/50">
                <button
                  className="flex-1 btn-primary flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold shadow-lg shadow-red-500/20 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  onClick={handleCreate}
                  disabled={saving || !title || !assignedToId}
                >
                  {saving ? (
                    <>
                      <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Создание...
                    </>
                  ) : (
                    <>
                      {NI ? <NI.Plus className="w-4 h-4" /> : "+"} Создать задачу
                    </>
                  )}
                </button>
                <button
                  className="px-6 py-3 rounded-lg border border-gray-700 text-gray-300 hover:border-red-500/50 hover:bg-red-500/10 transition-all"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
