"use client";
import { useState, useEffect } from "react";
import useSWR from "swr";
import { useSuccess } from "@/components/SuccessProvider";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type ChecklistItem = {
  id: string;
  text: string;
  order: number;
  isActive: boolean;
};

export default function ShiftChecklist({ onComplete }: { onComplete: () => void }) {
  const { showSuccess } = useSuccess();
  const { data: items } = useSWR<ChecklistItem[]>("/api/checklist", fetcher);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  const activeItems = (items ?? []).filter((item) => item.isActive).sort((a, b) => a.order - b.order);

  const handleToggle = (itemId: string) => {
    const newChecked = new Set(checkedItems);
    if (newChecked.has(itemId)) {
      newChecked.delete(itemId);
    } else {
      newChecked.add(itemId);
    }
    setCheckedItems(newChecked);
  };

  const handleComplete = () => {
    if (checkedItems.size === activeItems.length) {
      showSuccess("Чек-лист выполнен!");
      onComplete();
    } else {
      alert("Пожалуйста, выполните все пункты чек-листа");
    }
  };

  const allChecked = activeItems.length > 0 && checkedItems.size === activeItems.length;

  if (!items || activeItems.length === 0) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0, 0, 0, 0.9)" }}>
      <div className="modal-panel max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-white">Чек-лист перед сменой</h2>
        </div>

        <div className="space-y-3 mb-6">
          {activeItems.map((item) => {
            const isChecked = checkedItems.has(item.id);
            return (
              <label
                key={item.id}
                className={`flex items-center gap-3 p-4 border rounded cursor-pointer transition-all ${
                  isChecked
                    ? "bg-green-500/10 border-green-500/50"
                    : "bg-gray-900 border-red-500/30 hover:border-red-500/50"
                }`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => handleToggle(item.id)}
                  className="w-5 h-5 rounded border-gray-700 text-red-600 focus:ring-red-500"
                />
                <span className="flex-1 text-white">{item.text}</span>
                {isChecked && <span className="text-green-500 text-xl">✓</span>}
              </label>
            );
          })}
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-400">
            Выполнено: {checkedItems.size} из {activeItems.length}
          </div>
          <button
            className="btn-primary flex items-center gap-2"
            onClick={handleComplete}
            disabled={!allChecked}
          >
            <span>✓</span>
            Завершить чек-лист
          </button>
        </div>
      </div>
    </div>
  );
}

