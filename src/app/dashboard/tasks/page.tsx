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
  const { data: session } = useSession();
  const role = ((session as any)?.user as any)?.role as string | undefined;
  const NI = useNextIcons();
  const { showSuccess } = useSuccess();

  const isDirector = role === "DIRECTOR";
  const { data: employees } = useSWR<Employee[]>(isDirector ? "/api/employees" : null, fetcher);
  const { data: tasks, mutate } = useSWR<Task[]>(
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

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setAssignedToId("");
    setPriority("MEDIUM");
    setDueDate("");
    setSelectedTask(null);
  };

  const handleCreate = async () => {
    if (!title || !assignedToId) {
      alert("Заполните название задачи и выберите сотрудника");
      return;
    }

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, assignedToId, priority, dueDate: dueDate || undefined }),
      });

      if (!res.ok) throw new Error("Ошибка при создании задачи");

      showSuccess("Задача создана!");
      mutate();
      setShowModal(false);
      resetForm();
    } catch (error) {
      alert("Ошибка при создании задачи");
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

  const priorityLabels: Record<string, string> = {
    LOW: "Низкий",
    MEDIUM: "Средний",
    HIGH: "Высокий",
    URGENT: "Срочно",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Задачи</h1>
        {isDirector && (
          <button className="btn-primary flex items-center gap-1" onClick={() => setShowModal(true)}>
            <NI.Plus className="w-4 h-4" /> Создать задачу
          </button>
        )}
      </div>

      <div className="card overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left">
              <th className="p-2">Название</th>
              <th className="p-2">Сотрудник</th>
              <th className="p-2">Приоритет</th>
              <th className="p-2">Статус</th>
              <th className="p-2">Срок</th>
              <th className="p-2">Действия</th>
            </tr>
          </thead>
          <tbody>
            {(tasks ?? []).map((task) => (
              <tr key={task.id} className="border-t hover:bg-gray-50/5">
                <td className="p-2">
                  <div className="font-medium">{task.title}</div>
                  {task.description && (
                    <div className="text-xs text-gray-400 mt-1">{task.description}</div>
                  )}
                </td>
                <td className="p-2">{task.assignedTo.name}</td>
                <td className="p-2">
                  <span className={`chip ${priorityColors[task.priority]}`}>
                    {priorityLabels[task.priority]}
                  </span>
                </td>
                <td className="p-2">
                  <span className="chip">{statusLabels[task.status]}</span>
                </td>
                <td className="p-2">
                  {task.dueDate ? new Date(task.dueDate).toLocaleDateString("ru-RU") : "-"}
                </td>
                <td className="p-2">
                  <div className="flex gap-2">
                    {task.status !== "COMPLETED" && task.status !== "CANCELLED" && (
                      <>
                        {task.status === "PENDING" && (
                          <button
                            className="btn-ghost text-xs"
                            onClick={() => handleUpdateStatus(task.id, "IN_PROGRESS")}
                          >
                            В работу
                          </button>
                        )}
                        {task.status === "IN_PROGRESS" && (
                          <button
                            className="btn-ghost text-xs"
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
            ))}
          </tbody>
        </table>
      </div>

      {showModal && isDirector && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0, 0, 0, 0.8)" }}
          onClick={() => {
            setShowModal(false);
            resetForm();
          }}
        >
          <div className="modal-panel max-w-lg w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Создать задачу</h2>
              <button
                className="text-white text-2xl hover:text-red-500 transition-colors"
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-2 text-white">Название задачи *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full border rounded px-3 py-2 bg-gray-900 text-white border-gray-700"
                  placeholder="Введите название задачи"
                />
              </div>

              <div>
                <label className="block text-sm mb-2 text-white">Описание</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full border rounded px-3 py-2 bg-gray-900 text-white border-gray-700"
                  placeholder="Описание задачи"
                />
              </div>

              <div>
                <label className="block text-sm mb-2 text-white">Сотрудник *</label>
                <select
                  value={assignedToId}
                  onChange={(e) => setAssignedToId(e.target.value)}
                  className="w-full border rounded px-3 py-2 bg-gray-900 text-white border-gray-700"
                >
                  <option value="">Выберите сотрудника</option>
                  {(employees ?? []).map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm mb-2 text-white">Приоритет</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full border rounded px-3 py-2 bg-gray-900 text-white border-gray-700"
                >
                  <option value="LOW">Низкий</option>
                  <option value="MEDIUM">Средний</option>
                  <option value="HIGH">Высокий</option>
                  <option value="URGENT">Срочно</option>
                </select>
              </div>

              <div>
                <label className="block text-sm mb-2 text-white">Срок выполнения</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full border rounded px-3 py-2 bg-gray-900 text-white border-gray-700"
                />
              </div>

              <button className="w-full btn-primary" onClick={handleCreate}>
                Создать задачу
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

