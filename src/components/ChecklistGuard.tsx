"use client";
import { useEffect, useState } from "react";
import ShiftChecklist from "./ShiftChecklist";

export default function ChecklistGuard({ children }: { children: React.ReactNode }) {
  const [showChecklist, setShowChecklist] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Проверяем, выполнен ли чек-лист сегодня
    const today = new Date().toDateString();
    const completed = localStorage.getItem("checklistCompleted");

    // Если чек-лист не выполнен сегодня, показываем его
    if (completed !== today) {
      setShowChecklist(true);
    }
    setIsChecking(false);
  }, []);

  const handleComplete = async () => {
    const today = new Date().toDateString();
    localStorage.setItem("checklistCompleted", today);
    
    // Отправляем уведомление в Telegram
    try {
      await fetch("/api/checklist/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Failed to send checklist notification:", error);
      // Не блокируем завершение чек-листа из-за ошибки уведомления
    }
    
    setShowChecklist(false);
  };

  if (isChecking) {
    return null;
  }

  if (showChecklist) {
    return <ShiftChecklist onComplete={handleComplete} />;
  }

  return <>{children}</>;
}

