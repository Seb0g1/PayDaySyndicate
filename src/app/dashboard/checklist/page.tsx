"use client";
import { useState, useEffect } from "react";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import { useNextIcons } from "@/components/NI";
import { useSuccess } from "@/components/SuccessProvider";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type ChecklistItem = {
  id: string;
  text: string;
  order: number;
  isActive: boolean;
};

export default function ChecklistPage() {
  const { data: session } = useSession();
  const role = ((session as any)?.user as any)?.role as string | undefined;
  const NI = useNextIcons();
  const { showSuccess } = useSuccess();

  const isDirector = role === "DIRECTOR";
  const { data: items, mutate } = useSWR<ChecklistItem[]>("/api/checklist", fetcher);

  const [localItems, setLocalItems] = useState<ChecklistItem[]>([]);
  const [newItemText, setNewItemText] = useState("");

  useEffect(() => {
    if (items) {
      setLocalItems(items);
    }
  }, [items]);

  const handleAdd = () => {
    if (!newItemText.trim()) return;

    const newItem: ChecklistItem = {
      id: `temp_${Date.now()}`,
      text: newItemText,
      order: localItems.length,
      isActive: true,
    };

    setLocalItems([...localItems, newItem]);
    setNewItemText("");
  };

  const handleRemove = (index: number) => {
    setLocalItems(localItems.filter((_, i) => i !== index));
  };

  const handleMove = (index: number, direction: "up" | "down") => {
    const newItems = [...localItems];
    const targetIndex = direction === "up" ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= newItems.length) return;

    [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
    newItems.forEach((item, idx) => {
      item.order = idx;
    });

    setLocalItems(newItems);
  };

  const handleSave = async () => {
    if (!isDirector) return;

    try {
      const res = await fetch("/api/checklist", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(localItems),
      });

      if (!res.ok) throw new Error("Ошибка при сохранении чек-листа");

      showSuccess("Чек-лист сохранен!");
      mutate();
    } catch (error) {
      alert("Ошибка при сохранении чек-листа");
    }
  };

  const handleToggleActive = (index: number) => {
    const newItems = [...localItems];
    newItems[index].isActive = !newItems[index].isActive;
    setLocalItems(newItems);
  };

  if (!isDirector) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Чек-лист перед сменой</h1>
        <div className="card p-4">
          <p className="text-gray-400">Чек-лист доступен только для директора</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Управление чек-листом</h1>
        <button className="btn-primary flex items-center gap-1" onClick={handleSave}>
          <NI.Save className="w-4 h-4" /> Сохранить
        </button>
      </div>

      <div className="card p-4">
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                handleAdd();
              }
            }}
            className="flex-1 border rounded px-3 py-2 bg-gray-900 text-white border-gray-700"
            placeholder="Добавить пункт чек-листа"
          />
          <button className="btn-primary" onClick={handleAdd}>
            <NI.Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2">
          {localItems.map((item, index) => (
            <div
              key={item.id}
              className="flex items-center gap-2 p-3 border border-red-500/30 rounded bg-gray-900"
            >
              <div className="flex items-center gap-2 flex-1">
                <span className="text-gray-400 text-sm w-8">{index + 1}.</span>
                <input
                  type="text"
                  value={item.text}
                  onChange={(e) => {
                    const newItems = [...localItems];
                    newItems[index].text = e.target.value;
                    setLocalItems(newItems);
                  }}
                  className="flex-1 border rounded px-2 py-1 bg-gray-800 text-white border-gray-700"
                />
                <label className="flex items-center gap-2 text-white">
                  <input
                    type="checkbox"
                    checked={item.isActive}
                    onChange={() => handleToggleActive(index)}
                    className="rounded"
                  />
                  <span className="text-xs">Активен</span>
                </label>
              </div>
              <div className="flex gap-1">
                <button
                  className="btn-ghost text-xs"
                  onClick={() => handleMove(index, "up")}
                  disabled={index === 0}
                  title="Вверх"
                >
                  ↑
                </button>
                <button
                  className="btn-ghost text-xs"
                  onClick={() => handleMove(index, "down")}
                  disabled={index === localItems.length - 1}
                  title="Вниз"
                >
                  ↓
                </button>
                <button
                  className="btn-ghost text-xs text-red-500"
                  onClick={() => handleRemove(index)}
                  title="Удалить"
                >
                  <NI.Trash className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {localItems.length === 0 && (
          <p className="text-gray-400 text-center py-8">Нет пунктов чек-листа</p>
        )}
      </div>
    </div>
  );
}

