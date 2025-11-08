"use client";
import { useState, useMemo } from "react";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import { useNextIcons } from "@/components/NI";
import { useSuccess } from "@/components/SuccessProvider";
import { useError } from "@/components/ErrorProvider";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Ошибка загрузки данных");
  }
  // Убеждаемся, что возвращаем массив
  return Array.isArray(data) ? data : [];
};

type PCMapping = {
  id: string;
  pcNumber: string;
  name: string | null;
  uuid: string | null;
  isPS: boolean;
  pcTypeName: string | null;
  pcTypeNameEn: string | null;
  pcTypeColor: string | null;
  color: string | null;
};

type PCCommand = "tech_start" | "tech_stop" | "lock" | "unlock" | "reboot";
type PCCommandType = "all" | "free";

type PCGroup = {
  type: string;
  name: string;
  color: string;
  pcs: PCMapping[];
};

export default function PCManagementPage() {
  const { data: session } = useSession();
  const role = ((session as any)?.user as any)?.role as string | undefined;
  const NI = useNextIcons();
  const { showSuccess } = useSuccess();
  const { showError } = useError();

  const isDirector = role === "DIRECTOR" || role === "OWNER";
  
  const { data: pcs, mutate, error: pcsError } = useSWR<PCMapping[]>(isDirector ? "/api/pc/list" : null, fetcher);
  const [selectedPCs, setSelectedPCs] = useState<Set<string>>(new Set());
  const [commandType, setCommandType] = useState<PCCommandType>("all");
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Группируем ПК по типам
  const groupedPCs = useMemo(() => {
    if (!Array.isArray(pcs) || pcs.length === 0) return [];

    const groups: PCGroup[] = [];
    const typeMap = new Map<string, PCGroup>();

    // Стандартные типы
    const typeConfig = {
      STANDARD: { name: "STANDARD", displayName: "Standard", defaultColor: "#6b7280" },
      COMFORT: { name: "COMFORT", displayName: "Comfort", defaultColor: "#10b981" },
      VIP: { name: "VIP", displayName: "VIP", defaultColor: "#f59e0b" },
      BOOTCAMP: { name: "BOOTCAMP", displayName: "Bootcamp", defaultColor: "#8b5cf6" },
      PS5: { name: "PS5", displayName: "PlayStation 5", defaultColor: "#3b82f6" },
    };

    pcs.forEach((pc) => {
      let typeKey: string;
      let displayName: string;
      let color: string;

      if (pc.isPS) {
        typeKey = "PS5";
        displayName = typeConfig.PS5.displayName;
        color = pc.pcTypeColor || pc.color || typeConfig.PS5.defaultColor;
      } else {
        const typeEn = pc.pcTypeNameEn?.toUpperCase();
        if (typeEn && typeConfig[typeEn as keyof typeof typeConfig]) {
          typeKey = typeEn;
          displayName = typeConfig[typeEn as keyof typeof typeConfig].displayName;
          color = pc.pcTypeColor || pc.color || typeConfig[typeEn as keyof typeof typeConfig].defaultColor;
        } else {
          // Если тип не определен, используем название из API или дефолтный
          typeKey = pc.pcTypeNameEn?.toUpperCase() || pc.pcTypeName || "OTHER";
          displayName = pc.pcTypeName || "Другие";
          color = pc.pcTypeColor || pc.color || "#6b7280";
        }
      }

      if (!typeMap.has(typeKey)) {
        typeMap.set(typeKey, {
          type: typeKey,
          name: displayName,
          color,
          pcs: [],
        });
      }

      typeMap.get(typeKey)!.pcs.push(pc);
    });

    // Сортируем группы по порядку: STANDARD, COMFORT, VIP, BOOTCAMP, PS5, остальные
    const order = ["STANDARD", "COMFORT", "VIP", "BOOTCAMP", "PS5"];
    const sortedGroups: PCGroup[] = [];
    
    order.forEach((type) => {
      if (typeMap.has(type)) {
        sortedGroups.push(typeMap.get(type)!);
      }
    });

    // Добавляем остальные типы
    typeMap.forEach((group) => {
      if (!order.includes(group.type)) {
        sortedGroups.push(group);
      }
    });

    return sortedGroups;
  }, [pcs]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/pc/list", { method: "GET" });
      if (!res.ok) throw new Error("Ошибка синхронизации");
      showSuccess("ПК синхронизированы!");
      mutate();
    } catch (error: any) {
      showError(error.message || "Ошибка синхронизации");
    } finally {
      setSyncing(false);
    }
  };

  const handleManage = async (command: PCCommand, pcId?: string) => {
    // Если передан pcId, управляем одним ПК
    if (pcId) {
      const pc = Array.isArray(pcs) ? pcs.find((p) => p.id === pcId) : null;
      if (!pc || !pc.uuid) {
        showError("ПК не найден или не имеет UUID");
        return;
      }

      setLoading(true);
      try {
        const res = await fetch("/api/pc/manage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            command,
            type: "free", // Для управления конкретным ПК используем "free"
            uuids: [pc.uuid], // Передаем UUID конкретного ПК
          }),
        });

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || "Ошибка выполнения команды");
        }

        const commandNames: Record<PCCommand, string> = {
          tech_start: "Тех. старт",
          tech_stop: "Тех. стоп",
          lock: "Блокировка",
          unlock: "Разблокировка",
          reboot: "Перезагрузка",
        };

        showSuccess(`Команда "${commandNames[command]}" для ${pc.pcNumber} выполнена успешно!`);
      } catch (error: any) {
        showError(error.message || "Ошибка выполнения команды");
      } finally {
        setLoading(false);
      }
      return;
    }

    // Массовое управление
    setLoading(true);
    try {
      // Всегда используем type: "all" для выполнения команды
      // При type: "all" не передаем uuids (null)
      const res = await fetch("/api/pc/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          command,
          type: "all",
          uuids: null, // При type: "all" не передаем uuids
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Ошибка выполнения команды");
      }

      showSuccess(`Команда "${command}" выполнена успешно!`);
      setSelectedPCs(new Set());
    } catch (error: any) {
      showError(error.message || "Ошибка выполнения команды");
    } finally {
      setLoading(false);
    }
  };

  const togglePC = (id: string) => {
    const newSelected = new Set(selectedPCs);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedPCs(newSelected);
  };

  const selectAllInGroup = (group: PCGroup) => {
    const newSelected = new Set(selectedPCs);
    group.pcs.forEach((pc) => {
      if (pc.uuid) {
        newSelected.add(pc.id);
      }
    });
    setSelectedPCs(newSelected);
  };

  const deselectAllInGroup = (group: PCGroup) => {
    const newSelected = new Set(selectedPCs);
    group.pcs.forEach((pc) => {
      newSelected.delete(pc.id);
    });
    setSelectedPCs(newSelected);
  };

  if (!isDirector) {
    return (
      <div className="card p-6 text-center">
        <p className="text-gray-400">Доступ запрещен. Только директор может управлять ПК.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Управление ПК</h1>
        <button
          className="btn-primary flex items-center gap-2"
          onClick={handleSync}
          disabled={syncing}
        >
          <NI.RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Синхронизация..." : "Синхронизировать"}
        </button>
      </div>

      {/* Панель массового управления (опционально) */}
      <div className="card p-4">
        <div className="flex items-center gap-4 mb-4">
          <label className="text-sm font-medium text-white">Массовое управление:</label>
          <select
            value={commandType}
            onChange={(e) => {
              setCommandType(e.target.value as PCCommandType);
              setSelectedPCs(new Set());
            }}
            className="border rounded px-3 py-2 bg-gray-900 text-white border-gray-700"
          >
            <option value="all">Все ПК</option>
            <option value="free">Выбранные ПК</option>
          </select>
        </div>

        {commandType === "free" && (
          <>
            <div className="flex flex-wrap gap-2 mb-4">
              <button
                className="btn-primary text-sm"
                onClick={() => handleManage("tech_start")}
                disabled={loading || selectedPCs.size === 0}
              >
                Тех. старт
              </button>
              <button
                className="btn-primary text-sm"
                onClick={() => handleManage("tech_stop")}
                disabled={loading || selectedPCs.size === 0}
              >
                Тех. стоп
              </button>
              <button
                className="btn-primary text-sm"
                onClick={() => handleManage("lock")}
                disabled={loading || selectedPCs.size === 0}
              >
                Заблокировать
              </button>
              <button
                className="btn-primary text-sm"
                onClick={() => handleManage("unlock")}
                disabled={loading || selectedPCs.size === 0}
              >
                Разблокировать
              </button>
              <button
                className="btn-primary text-sm"
                onClick={() => handleManage("reboot")}
                disabled={loading || selectedPCs.size === 0}
              >
                Перезагрузка
              </button>
            </div>

            {selectedPCs.size > 0 && (
              <div className="text-sm text-gray-300">
                Выбрано ПК: <span className="text-white font-semibold">{selectedPCs.size}</span>
              </div>
            )}
          </>
        )}

        {commandType === "all" && (
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              className="btn-primary text-sm"
              onClick={() => handleManage("tech_start")}
              disabled={loading}
            >
              Тех. старт (все)
            </button>
            <button
              className="btn-primary text-sm"
              onClick={() => handleManage("tech_stop")}
              disabled={loading}
            >
              Тех. стоп (все)
            </button>
            <button
              className="btn-primary text-sm"
              onClick={() => handleManage("lock")}
              disabled={loading}
            >
              Заблокировать (все)
            </button>
            <button
              className="btn-primary text-sm"
              onClick={() => handleManage("unlock")}
              disabled={loading}
            >
              Разблокировать (все)
            </button>
            <button
              className="btn-primary text-sm"
              onClick={() => handleManage("reboot")}
              disabled={loading}
            >
              Перезагрузка (все)
            </button>
          </div>
        )}
      </div>

      {pcsError && (
        <div className="card p-4 bg-red-500/10 border border-red-500/30">
          <p className="text-red-400 text-sm">{pcsError.message || "Ошибка загрузки списка ПК"}</p>
        </div>
      )}

      {!pcsError && (
        <>
          {groupedPCs.length === 0 ? (
            <div className="card p-6 text-center">
              <p className="text-gray-400">
                Нет данных о ПК. Нажмите "Синхронизировать" для загрузки данных из Langame API.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {groupedPCs.map((group) => {
                const selectedInGroup = group.pcs.filter((pc) => selectedPCs.has(pc.id)).length;
                const allSelected = selectedInGroup === group.pcs.length && group.pcs.length > 0;

                return (
                  <div key={group.type} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: group.color }}
                        />
                        <h2 className="text-xl font-semibold text-white">{group.name}</h2>
                        <span className="text-sm text-gray-400">
                          ({group.pcs.length} {group.pcs.length === 1 ? "ПК" : "ПК"})
                        </span>
                      </div>
                      {commandType === "free" && group.pcs.length > 0 && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => (allSelected ? deselectAllInGroup(group) : selectAllInGroup(group))}
                            className="text-sm text-gray-400 hover:text-white transition-colors"
                          >
                            {allSelected ? "Снять выбор" : "Выбрать все"}
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {group.pcs.map((pc) => {
                        const isSelected = selectedPCs.has(pc.id);
                        const cardColor = pc.color || group.color || "#6b7280";

                        return (
                          <div
                            key={pc.id}
                            className={`relative card p-4 transition-all duration-200 ${
                              isSelected
                                ? "ring-2 ring-red-500 shadow-lg scale-[1.02]"
                                : "hover:shadow-lg hover:scale-[1.01]"
                            }`}
                            style={{
                              borderLeft: `4px solid ${cardColor}`,
                            }}
                          >
                            {commandType === "free" && (
                              <div className="absolute top-2 right-2">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => togglePC(pc.id)}
                                  className="w-5 h-5 rounded border-gray-700 text-red-600 focus:ring-red-500 cursor-pointer"
                                />
                              </div>
                            )}

                            <div className="space-y-3">
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-3 h-3 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: cardColor }}
                                />
                                <h3 className="font-semibold text-white text-lg">
                                  {pc.pcNumber}
                                  {pc.isPS && (
                                    <span className="ml-2 text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded">
                                      PS5
                                    </span>
                                  )}
                                </h3>
                              </div>

                              {pc.name && (
                                <p className="text-sm text-gray-300">{pc.name}</p>
                              )}

                              {pc.pcTypeName && (
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-400">Тип:</span>
                                  <span className="text-xs text-white">{pc.pcTypeName}</span>
                                </div>
                              )}

                              {pc.uuid && (
                                <div className="pt-2 border-t border-gray-700">
                                  <p className="text-xs text-gray-400 font-mono break-all">
                                    {pc.uuid}
                                  </p>
                                </div>
                              )}

                              {/* Кнопки управления ПК */}
                              <div className="pt-2 border-t border-gray-700">
                                <div className="grid grid-cols-2 gap-2">
                                  <button
                                    onClick={() => handleManage("tech_start", pc.id)}
                                    disabled={loading || !pc.uuid}
                                    className="flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs bg-green-600/20 hover:bg-green-600/30 text-green-300 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Тех. старт"
                                  >
                                    <NI.Play className="w-3 h-3" />
                                    <span className="hidden sm:inline">Старт</span>
                                  </button>
                                  <button
                                    onClick={() => handleManage("tech_stop", pc.id)}
                                    disabled={loading || !pc.uuid}
                                    className="flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs bg-red-600/20 hover:bg-red-600/30 text-red-300 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Тех. стоп"
                                  >
                                    <NI.Stop className="w-3 h-3" />
                                    <span className="hidden sm:inline">Стоп</span>
                                  </button>
                                  <button
                                    onClick={() => handleManage("lock", pc.id)}
                                    disabled={loading || !pc.uuid}
                                    className="flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs bg-orange-600/20 hover:bg-orange-600/30 text-orange-300 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Заблокировать"
                                  >
                                    <NI.Lock className="w-3 h-3" />
                                    <span className="hidden sm:inline">Блок</span>
                                  </button>
                                  <button
                                    onClick={() => handleManage("unlock", pc.id)}
                                    disabled={loading || !pc.uuid}
                                    className="flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Разблокировать"
                                  >
                                    <NI.Unlock className="w-3 h-3" />
                                    <span className="hidden sm:inline">Откр</span>
                                  </button>
                                  <button
                                    onClick={() => handleManage("reboot", pc.id)}
                                    disabled={loading || !pc.uuid}
                                    className="flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 rounded transition-colors col-span-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Перезагрузка"
                                  >
                                    <NI.RotateCw className="w-3 h-3" />
                                    <span>Перезагрузка</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
