"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useSuccess } from "@/components/SuccessProvider";
import { useError } from "@/components/ErrorProvider";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function TelegramPage() {
  const { data: session } = useSession();
  const { showSuccess } = useSuccess();
  const { showError } = useError();
  
  const { data: settings, mutate } = useSWR<{ 
    botToken: string | null; 
    chatId: string | null; 
    enabled: boolean;
    topicShift?: string | null;
    topicHookah?: string | null;
    topicCorkFee?: string | null;
    topicPlayStation?: string | null;
    topicInvoice?: string | null;
    topicPromotion?: string | null;
    topicPenalty?: string | null;
    topicBonus?: string | null;
    topicPayment?: string | null;
    topicSchedule?: string | null;
    topicTables?: string | null;
    topicDebt?: string | null;
    topicTasks?: string | null;
    topicChecklist?: string | null;
    topicLostItems?: string | null;
  }>("/api/telegram/settings", fetcher);
  
  const [botToken, setBotToken] = useState("");
  const [chatId, setChatId] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [topicShift, setTopicShift] = useState("");
  const [topicHookah, setTopicHookah] = useState("");
  const [topicCorkFee, setTopicCorkFee] = useState("");
  const [topicPlayStation, setTopicPlayStation] = useState("");
  const [topicInvoice, setTopicInvoice] = useState("");
  const [topicPromotion, setTopicPromotion] = useState("");
  const [topicTables, setTopicTables] = useState("");
  const [topicPenalty, setTopicPenalty] = useState("");
  const [topicBonus, setTopicBonus] = useState("");
  const [topicPayment, setTopicPayment] = useState("");
  const [topicSchedule, setTopicSchedule] = useState("");
  const [topicDebt, setTopicDebt] = useState("");
  const [topicTasks, setTopicTasks] = useState("");
  const [topicChecklist, setTopicChecklist] = useState("");
  const [topicLostItems, setTopicLostItems] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setBotToken(settings.botToken || "");
      setChatId(settings.chatId || "");
      setEnabled(settings.enabled || false);
      setTopicShift(settings.topicShift || "");
      setTopicHookah(settings.topicHookah || "");
      setTopicCorkFee(settings.topicCorkFee || "");
      setTopicPlayStation(settings.topicPlayStation || "");
      setTopicInvoice(settings.topicInvoice || "");
      setTopicPromotion(settings.topicPromotion || "");
      setTopicTables(settings.topicTables || "");
      setTopicPenalty(settings.topicPenalty || "");
      setTopicBonus(settings.topicBonus || "");
      setTopicPayment(settings.topicPayment || "");
      setTopicSchedule(settings.topicSchedule || "");
      setTopicDebt(settings.topicDebt || "");
      setTopicTasks(settings.topicTasks || "");
      setTopicChecklist(settings.topicChecklist || "");
      setTopicLostItems(settings.topicLostItems || "");
    }
  }, [settings]);

  const saveSettings = async () => {
    if (!botToken.trim()) {
      showError("Токен бота обязателен");
      return;
    }
    
    setSaving(true);
    try {
      const res = await fetch("/api/telegram/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          botToken, 
          chatId, 
          enabled,
          topicShift,
          topicHookah,
          topicCorkFee,
          topicPlayStation,
          topicInvoice,
          topicPromotion,
          topicTables,
          topicPenalty,
          topicBonus,
          topicPayment,
          topicSchedule,
          topicDebt,
          topicTasks,
          topicChecklist,
          topicLostItems,
        }),
      });
      
      if (!res.ok) {
        const error = await res.json();
        showError(error.message || "Ошибка сохранения настроек");
        return;
      }
      
      showSuccess("Настройки сохранены!");
      mutate();
    } catch (error: any) {
      showError(error.message || "Ошибка сохранения настроек");
    } finally {
      setSaving(false);
    }
  };

  const testBot = async (topicId?: string, topicName?: string) => {
    setSaving(true);
    try {
      const res = await fetch("/api/telegram/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicId }),
      });
      
      if (!res.ok) {
        const error = await res.json();
        showError(error.message || "Ошибка отправки тестового сообщения");
        return;
      }
      
      showSuccess(`Тестовое сообщение отправлено${topicName ? ` в "${topicName}"` : ""}!`);
    } catch (error: any) {
      showError(error.message || "Ошибка отправки тестового сообщения");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="card p-6">
        <h2 className="text-2xl font-bold text-white mb-6">Настройки Telegram</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Токен бота
            </label>
            <input
              type="text"
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
              placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
              className="w-full border rounded px-3 py-2"
              disabled={saving}
            />
            <p className="mt-1 text-xs text-gray-400">
              Получите токен у @BotFather в Telegram
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">
              ID группы/чата (необязательно)
            </label>
            <input
              type="text"
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
              placeholder="-1001234567890"
              className="w-full border rounded px-3 py-2"
              disabled={saving}
            />
            <p className="mt-1 text-xs text-gray-400">
              Оставьте пустым, если будете использовать топики
            </p>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="enabled"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              disabled={saving}
              className="w-5 h-5 rounded border border-gray-600"
            />
            <label htmlFor="enabled" className="text-white cursor-pointer">
              Включить уведомления
            </label>
          </div>

          <div className="pt-4 border-t border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-3">ID топиков</h3>
            
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input type="text" value={topicShift} onChange={(e) => setTopicShift(e.target.value)} placeholder="-1002586575405_3235" className="flex-1 border rounded px-3 py-1.5 text-sm" disabled={saving} />
                <button onClick={() => testBot(topicShift, "Отчеты по сменам")} disabled={saving || !topicShift || !botToken} className="btn-ghost px-3 py-1.5 text-xs whitespace-nowrap">Тест</button>
                <label className="w-36 text-xs font-medium text-gray-300">Отчеты по сменам</label>
              </div>
              
              <div className="flex items-center gap-2">
                <input type="text" value={topicHookah} onChange={(e) => setTopicHookah(e.target.value)} placeholder="-1002586575405_10539" className="flex-1 border rounded px-3 py-1.5 text-sm" disabled={saving} />
                <button onClick={() => testBot(topicHookah, "Учет кальянов")} disabled={saving || !topicHookah || !botToken} className="btn-ghost px-3 py-1.5 text-xs whitespace-nowrap">Тест</button>
                <label className="w-36 text-xs font-medium text-gray-300">Учет кальянов</label>
              </div>
              
              <div className="flex items-center gap-2">
                <input type="text" value={topicCorkFee} onChange={(e) => setTopicCorkFee(e.target.value)} placeholder="-1002586575405_12012" className="flex-1 border rounded px-3 py-1.5 text-sm" disabled={saving} />
                <button onClick={() => testBot(topicCorkFee, "Пробковый сбор")} disabled={saving || !topicCorkFee || !botToken} className="btn-ghost px-3 py-1.5 text-xs whitespace-nowrap">Тест</button>
                <label className="w-36 text-xs font-medium text-gray-300">Пробковый сбор</label>
              </div>
              
              <div className="flex items-center gap-2">
                <input type="text" value={topicPlayStation} onChange={(e) => setTopicPlayStation(e.target.value)} placeholder="-1002586575405_12017" className="flex-1 border rounded px-3 py-1.5 text-sm" disabled={saving} />
                <button onClick={() => testBot(topicPlayStation, "PlayStation")} disabled={saving || !topicPlayStation || !botToken} className="btn-ghost px-3 py-1.5 text-xs whitespace-nowrap">Тест</button>
                <label className="w-36 text-xs font-medium text-gray-300">PlayStation</label>
              </div>
              
              <div className="flex items-center gap-2">
                <input type="text" value={topicInvoice} onChange={(e) => setTopicInvoice(e.target.value)} placeholder="-1002586575405_7651" className="flex-1 border rounded px-3 py-1.5 text-sm" disabled={saving} />
                <button onClick={() => testBot(topicInvoice, "Накладные")} disabled={saving || !topicInvoice || !botToken} className="btn-ghost px-3 py-1.5 text-xs whitespace-nowrap">Тест</button>
                <label className="w-36 text-xs font-medium text-gray-300">Накладные</label>
              </div>
              
              <div className="flex items-center gap-2">
                <input type="text" value={topicPromotion} onChange={(e) => setTopicPromotion(e.target.value)} placeholder="-1002586575405_13455" className="flex-1 border rounded px-3 py-1.5 text-sm" disabled={saving} />
                <button onClick={() => testBot(topicPromotion, "Акции")} disabled={saving || !topicPromotion || !botToken} className="btn-ghost px-3 py-1.5 text-xs whitespace-nowrap">Тест</button>
                <label className="w-36 text-xs font-medium text-gray-300">Акции</label>
              </div>
              
              <div className="flex items-center gap-2">
                <input type="text" value={topicTables} onChange={(e) => setTopicTables(e.target.value)} placeholder="-1002586575405_14281" className="flex-1 border rounded px-3 py-1.5 text-sm" disabled={saving} />
                <button onClick={() => testBot(topicTables, "Состояние столов")} disabled={saving || !topicTables || !botToken} className="btn-ghost px-3 py-1.5 text-xs whitespace-nowrap">Тест</button>
                <label className="w-36 text-xs font-medium text-gray-300">Состояние столов</label>
              </div>
              
              <div className="flex items-center gap-2">
                <input type="text" value={topicPenalty} onChange={(e) => setTopicPenalty(e.target.value)} placeholder="-1002586575405_14439" className="flex-1 border rounded px-3 py-1.5 text-sm" disabled={saving} />
                <button onClick={() => testBot(topicPenalty, "Штрафы")} disabled={saving || !topicPenalty || !botToken} className="btn-ghost px-3 py-1.5 text-xs whitespace-nowrap">Тест</button>
                <label className="w-36 text-xs font-medium text-gray-300">Штрафы</label>
              </div>
              
              <div className="flex items-center gap-2">
                <input type="text" value={topicBonus} onChange={(e) => setTopicBonus(e.target.value)} placeholder="-1002586575405_14439" className="flex-1 border rounded px-3 py-1.5 text-sm" disabled={saving} />
                <button onClick={() => testBot(topicBonus, "Бонусы")} disabled={saving || !topicBonus || !botToken} className="btn-ghost px-3 py-1.5 text-xs whitespace-nowrap">Тест</button>
                <label className="w-36 text-xs font-medium text-gray-300">Бонусы</label>
              </div>
              
              <div className="flex items-center gap-2">
                <input type="text" value={topicPayment} onChange={(e) => setTopicPayment(e.target.value)} placeholder="-1002586575405_14439" className="flex-1 border rounded px-3 py-1.5 text-sm" disabled={saving} />
                <button onClick={() => testBot(topicPayment, "Выплаты")} disabled={saving || !topicPayment || !botToken} className="btn-ghost px-3 py-1.5 text-xs whitespace-nowrap">Тест</button>
                <label className="w-36 text-xs font-medium text-gray-300">Выплаты</label>
              </div>
              
              <div className="flex items-center gap-2">
                <input type="text" value={topicSchedule} onChange={(e) => setTopicSchedule(e.target.value)} placeholder="-1002586575405_5" className="flex-1 border rounded px-3 py-1.5 text-sm" disabled={saving} />
                <button onClick={() => testBot(topicSchedule, "График")} disabled={saving || !topicSchedule || !botToken} className="btn-ghost px-3 py-1.5 text-xs whitespace-nowrap">Тест</button>
                <label className="w-36 text-xs font-medium text-gray-300">График</label>
              </div>
              
              <div className="flex items-center gap-2">
                <input type="text" value={topicDebt} onChange={(e) => setTopicDebt(e.target.value)} placeholder="-1002586575405_14439" className="flex-1 border rounded px-3 py-1.5 text-sm" disabled={saving} />
                <button onClick={() => testBot(topicDebt, "Долги")} disabled={saving || !topicDebt || !botToken} className="btn-ghost px-3 py-1.5 text-xs whitespace-nowrap">Тест</button>
                <label className="w-36 text-xs font-medium text-gray-300">Долги</label>
              </div>
              
              <div className="flex items-center gap-2">
                <input type="text" value={topicTasks} onChange={(e) => setTopicTasks(e.target.value)} placeholder="-1002586575405_14439" className="flex-1 border rounded px-3 py-1.5 text-sm" disabled={saving} />
                <button onClick={() => testBot(topicTasks, "Задачи")} disabled={saving || !topicTasks || !botToken} className="btn-ghost px-3 py-1.5 text-xs whitespace-nowrap">Тест</button>
                <label className="w-36 text-xs font-medium text-gray-300">Задачи</label>
              </div>
              
              <div className="flex items-center gap-2">
                <input type="text" value={topicChecklist} onChange={(e) => setTopicChecklist(e.target.value)} placeholder="-1002586575405_14439" className="flex-1 border rounded px-3 py-1.5 text-sm" disabled={saving} />
                <button onClick={() => testBot(topicChecklist, "Чек-лист")} disabled={saving || !topicChecklist || !botToken} className="btn-ghost px-3 py-1.5 text-xs whitespace-nowrap">Тест</button>
                <label className="w-36 text-xs font-medium text-gray-300">Чек-лист</label>
              </div>
              
              <div className="flex items-center gap-2">
                <input type="text" value={topicLostItems} onChange={(e) => setTopicLostItems(e.target.value)} placeholder="-1002586575405_14439" className="flex-1 border rounded px-3 py-1.5 text-sm" disabled={saving} />
                <button onClick={() => testBot(topicLostItems, "Забытые вещи")} disabled={saving || !topicLostItems || !botToken} className="btn-ghost px-3 py-1.5 text-xs whitespace-nowrap">Тест</button>
                <label className="w-36 text-xs font-medium text-gray-300">Забытые вещи</label>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={saveSettings}
              disabled={saving}
              className="btn-primary flex-1"
            >
              {saving ? "Сохранение..." : "Сохранить"}
            </button>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h3 className="text-xl font-bold text-white mb-4">Система уведомлений</h3>
        <div className="space-y-3 text-sm text-gray-300">
          <p>
            <span className="font-semibold text-white">Отчеты о сменах:</span> Уведомления о начале/окончании смен
          </p>
          <p>
            <span className="font-semibold text-white">Пробковый сбор:</span> Уведомления о добавленных отчетах
          </p>
          <p>
            <span className="font-semibold text-white">Другие отчеты:</span> Каждый тип отчета в отдельном топике
          </p>
          <p>
            <span className="font-semibold text-white">Добавление смен:</span> Уведомления о назначенных сменах
          </p>
          <p>
            <span className="font-semibold text-white">Долги:</span> Уведомления о взятых товарах в долг
          </p>
        </div>
      </div>
    </div>
  );
}

