"use client";
import { useState, useEffect } from "react";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import { useSuccess } from "@/components/SuccessProvider";
import { useError } from "@/components/ErrorProvider";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function LangameSettingsPage() {
  const { data: session } = useSession();
  const role = ((session as any)?.user as any)?.role as string | undefined;
  const { showSuccess } = useSuccess();
  const { showError } = useError();

  const isDirector = role === "DIRECTOR";
  
  const { data: settings, mutate } = useSWR<{
    apiKey: string | null;
    clubId: string | null;
    enabled: boolean;
    baseUrl: string;
    excludedProductIds: number[];
  }>(isDirector ? "/api/langame/settings" : null, fetcher);

  const [apiKey, setApiKey] = useState("");
  const [clubId, setClubId] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [baseUrl, setBaseUrl] = useState("https://api.langame.ru");
  const [excludedProductIds, setExcludedProductIds] = useState<number[]>([]);
  const [newExcludedId, setNewExcludedId] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setApiKey(settings.apiKey || "");
      setClubId(settings.clubId || "");
      setEnabled(settings.enabled || false);
      setBaseUrl(settings.baseUrl || "https://api.langame.ru");
      setExcludedProductIds(settings.excludedProductIds || []);
    }
  }, [settings]);

  const saveSettings = async () => {
    if (!apiKey.trim() || !clubId.trim()) {
      showError("API ключ и ID клуба обязательны");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/langame/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: apiKey.trim(),
          clubId: clubId.trim(),
          enabled,
          baseUrl: baseUrl.trim() || "https://api.langame.ru",
          excludedProductIds,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Ошибка сохранения настроек");
      }

      showSuccess("Настройки Langame сохранены!");
      mutate();
    } catch (error: any) {
      showError(error.message || "Ошибка сохранения настроек");
    } finally {
      setSaving(false);
    }
  };

  if (!isDirector) {
    return (
      <div className="card p-6 text-center">
        <p className="text-gray-400">Доступ запрещен. Только директор может настраивать Langame API.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Настройки Langame API</h1>

      <div className="card p-6 space-y-4">
        <div>
          <label className="block text-sm mb-2 text-white">API ключ</label>
          <input
            type="text"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="w-full border rounded px-3 py-2 bg-gray-900 text-white border-gray-700"
            placeholder="Введите API ключ"
          />
        </div>

        <div>
          <label className="block text-sm mb-2 text-white">ID клуба</label>
          <input
            type="text"
            value={clubId}
            onChange={(e) => setClubId(e.target.value)}
            className="w-full border rounded px-3 py-2 bg-gray-900 text-white border-gray-700"
            placeholder="Введите ID клуба"
          />
        </div>

        <div>
          <label className="block text-sm mb-2 text-white">Базовый URL API</label>
          <input
            type="text"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            className="w-full border rounded px-3 py-2 bg-gray-900 text-white border-gray-700"
            placeholder="https://api.langame.ru"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="w-4 h-4 rounded border-gray-700 text-red-600 focus:ring-red-500"
          />
          <label className="text-sm text-white">Включить интеграцию с Langame</label>
        </div>

        <button
          onClick={saveSettings}
          disabled={saving}
          className="w-full btn-primary"
        >
          {saving ? "Сохранение..." : "Сохранить настройки"}
        </button>
      </div>

      <div className="card p-6 space-y-4">
        <h3 className="text-xl font-bold text-white">Исключения товаров из синхронизации</h3>
        <p className="text-sm text-gray-300">
          Укажите ID товаров из Langame API, которые не должны синхронизироваться. 
          Эти товары будут пропущены при синхронизации и не будут отображаться в списке товаров.
        </p>

        <div className="flex gap-2">
          <input
            type="number"
            value={newExcludedId}
            onChange={(e) => setNewExcludedId(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                const id = parseInt(newExcludedId);
                if (id && !excludedProductIds.includes(id)) {
                  setExcludedProductIds([...excludedProductIds, id]);
                  setNewExcludedId("");
                }
              }
            }}
            className="flex-1 border rounded px-3 py-2 bg-gray-900 text-white border-gray-700"
            placeholder="Введите ID товара"
          />
          <button
            onClick={() => {
              const id = parseInt(newExcludedId);
              if (id && !excludedProductIds.includes(id)) {
                setExcludedProductIds([...excludedProductIds, id]);
                setNewExcludedId("");
              }
            }}
            className="btn-secondary"
          >
            Добавить
          </button>
        </div>

        {excludedProductIds.length > 0 && (
          <div className="space-y-2">
            <label className="block text-sm text-white">Исключенные ID товаров:</label>
            <div className="flex flex-wrap gap-2">
              {excludedProductIds.map((id) => (
                <span
                  key={id}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-red-900/30 text-red-200 rounded border border-red-800"
                >
                  {id}
                  <button
                    onClick={() => {
                      setExcludedProductIds(excludedProductIds.filter((exId) => exId !== id));
                    }}
                    className="text-red-400 hover:text-red-300 ml-1"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {excludedProductIds.length === 0 && (
          <p className="text-sm text-gray-400 italic">Нет исключенных товаров</p>
        )}
      </div>

      <div className="card p-6">
        <h3 className="text-xl font-bold text-white mb-4">Информация</h3>
        <div className="space-y-2 text-sm text-gray-300">
          <p>
            <span className="font-semibold text-white">API ключ:</span> Получите в настройках вашего сайта Langame
          </p>
          <p>
            <span className="font-semibold text-white">ID клуба:</span> Указывается в настройках вашего сайта Langame
          </p>
          <p>
            <span className="font-semibold text-white">Синхронизация товаров:</span> Используйте кнопку "Синхронизировать с Langame" на странице товаров для обновления остатков
          </p>
        </div>
      </div>
    </div>
  );
}

