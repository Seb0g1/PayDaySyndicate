"use client";
import { useState, useEffect } from "react";
import { useSiteSettings } from "@/components/SiteSettingsProvider";
import { useSession } from "next-auth/react";
import { useSuccess } from "@/components/SuccessProvider";
import { useNextIcons } from "@/components/NI";
import useSWR from "swr";

export default function SiteSettingsPage() {
  const { settings, isLoading, mutate } = useSiteSettings();
  const { data: session } = useSession();
  const { showSuccess } = useSuccess();
  const NI = useNextIcons();
  
  const isDirector = (session?.user as any)?.role === "DIRECTOR";
  
  const [siteName, setSiteName] = useState("");
  const [siteIcon, setSiteIcon] = useState("PS");
  const [theme, setTheme] = useState<"dark" | "light" | "blue" | "purple" | "green">("dark");
  const [features, setFeatures] = useState({
    enableEmployees: settings?.enableEmployees ?? true,
    enableShifts: settings?.enableShifts ?? true,
    enableProducts: settings?.enableProducts ?? true,
    enableDebts: settings?.enableDebts ?? true,
    enableShortages: settings?.enableShortages ?? true,
    enableSalaries: settings?.enableSalaries ?? true,
    enableReports: settings?.enableReports ?? true,
    enableTasks: settings?.enableTasks ?? true,
    enableChecklist: settings?.enableChecklist ?? true,
    enableLostItems: settings?.enableLostItems ?? true,
    enableMemos: settings?.enableMemos ?? true,
    enablePayments: settings?.enablePayments ?? true,
    enablePcManagement: settings?.enablePcManagement ?? true,
    enableProductOrder: settings?.enableProductOrder ?? true,
    enableLangame: settings?.enableLangame ?? true,
    enableTelegram: settings?.enableTelegram ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [showRoles, setShowRoles] = useState(true); // Показывать роли по умолчанию
  const [payslipSettings, setPayslipSettings] = useState({
    payslipShowStamp: true,
    payslipBorderColor: "#000000",
    payslipWatermark: "",
    payslipStampImage: "/pechat.png",
  });
  const [uploadingStamp, setUploadingStamp] = useState(false);
  
  const fetcher = (url: string) => fetch(url).then((r) => r.json());
  const { data: roles, mutate: mutateRoles } = useSWR(showRoles ? "/api/roles" : null, fetcher);

  // Обновляем локальное состояние при загрузке настроек
  useEffect(() => {
    if (settings) {
      setSiteName(settings.siteName || "");
      setSiteIcon(settings.siteIcon || "PS");
      setTheme((settings.theme as any) || "dark");
      setFeatures({
        enableEmployees: settings.enableEmployees ?? true,
        enableShifts: settings.enableShifts ?? true,
        enableProducts: settings.enableProducts ?? true,
        enableDebts: settings.enableDebts ?? true,
        enableShortages: settings.enableShortages ?? true,
        enableSalaries: settings.enableSalaries ?? true,
        enableReports: settings.enableReports ?? true,
        enableTasks: settings.enableTasks ?? true,
        enableChecklist: settings.enableChecklist ?? true,
        enableLostItems: settings.enableLostItems ?? true,
        enableMemos: settings.enableMemos ?? true,
        enablePayments: settings.enablePayments ?? true,
        enablePcManagement: settings.enablePcManagement ?? true,
        enableProductOrder: settings.enableProductOrder ?? true,
        enableLangame: settings.enableLangame ?? true,
        enableTelegram: settings.enableTelegram ?? true,
      });
      setPayslipSettings({
        payslipShowStamp: settings.payslipShowStamp ?? true,
        payslipBorderColor: settings.payslipBorderColor || "#000000",
        payslipWatermark: settings.payslipWatermark || "",
        payslipStampImage: settings.payslipStampImage || "/pechat.png",
      });
    }
  }, [settings]);

  if (!isDirector) {
    return (
      <div className="card p-6">
        <h1 className="text-2xl font-bold mb-4">Настройки сайта</h1>
        <p className="text-gray-400">Доступ к настройкам сайта имеют только директора.</p>
      </div>
    );
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/site-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteName,
          siteIcon,
          theme,
          ...features,
          ...payslipSettings,
        }),
      });
      
      if (!res.ok) throw new Error("Ошибка при сохранении настроек");
      
      showSuccess("Настройки сохранены!");
      mutate();
    } catch (error) {
      alert("Ошибка при сохранении настроек");
    } finally {
      setSaving(false);
    }
  };

  const themes = [
    { 
      value: "dark", 
      label: "Тёмная", 
      icon: "Moon",
      color: "rgb(255, 0, 0)",
      description: "Классическая тёмная тема"
    },
    { 
      value: "light", 
      label: "Светлая", 
      icon: "Sun",
      color: "rgb(220, 38, 38)",
      description: "Светлая тема для дневного использования"
    },
    { 
      value: "blue", 
      label: "Синяя", 
      icon: "Droplet",
      color: "rgb(59, 130, 246)",
      description: "Синяя тема с акцентами"
    },
    { 
      value: "purple", 
      label: "Фиолетовая", 
      icon: "Palette",
      color: "rgb(168, 85, 247)",
      description: "Фиолетовая тема для творчества"
    },
    { 
      value: "green", 
      label: "Зелёная", 
      icon: "Sparkles",
      color: "rgb(34, 197, 94)",
      description: "Зелёная тема для комфорта"
    },
  ];

  const getThemeIcon = (iconName: string) => {
    if (!NI) return null;
    switch (iconName) {
      case "Moon": return <NI.Moon className="w-6 h-6" />;
      case "Sun": return <NI.Sun className="w-6 h-6" />;
      case "Droplet": return <NI.Droplet className="w-6 h-6" />;
      case "Palette": return <NI.Palette className="w-6 h-6" />;
      case "Sparkles": return <NI.Sparkles className="w-6 h-6" />;
      default: return null;
    }
  };

  const featureLabels: Record<string, string> = {
    enableEmployees: "Сотрудники",
    enableShifts: "Смены",
    enableProducts: "Товары",
    enableDebts: "Долги",
    enableShortages: "Недостачи",
    enableSalaries: "Зарплаты",
    enableReports: "Отчёты",
    enableTasks: "Задачи",
    enableChecklist: "Чек-лист",
    enableLostItems: "Забытые вещи",
    enableMemos: "Заметки",
    enablePayments: "Выплаты",
    enablePcManagement: "Управление ПК",
    enableProductOrder: "Заказы товаров",
    enableLangame: "Интеграция Langame",
    enableTelegram: "Telegram уведомления",
  };

  if (isLoading) {
    return (
      <div className="card p-6">
        <p className="text-gray-400">Загрузка настроек...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
          {NI ? <NI.Monitor className="w-6 h-6" /> : "⚙️"} Настройки сайта
        </h1>

        {/* Название сайта */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2 text-white">
            Название сайта
          </label>
          <input
            type="text"
            value={siteName}
            onChange={(e) => setSiteName(e.target.value)}
            className="w-full border rounded px-3 py-2 bg-gray-900 text-white border-gray-700 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all"
            placeholder="Введите название сайта"
          />
          <p className="text-xs text-gray-400 mt-1">
            Название будет отображаться в заголовке и навигации для всех пользователей
          </p>
        </div>

        {/* Иконка сайта */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2 text-white">
            Иконка сайта
          </label>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={siteIcon}
              onChange={(e) => setSiteIcon(e.target.value)}
              className="w-full border rounded px-3 py-2 bg-gray-900 text-white border-gray-700 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all"
              placeholder="PS или эмодзи (например, 🏢)"
              maxLength={10}
            />
            <div className="flex items-center justify-center w-12 h-12 border border-red-500 rounded-lg bg-gradient-to-br from-red-500/20 to-red-900/20 flex-shrink-0">
              <div className="text-red-500 font-bold text-sm">{siteIcon || "PS"}</div>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Иконка будет отображаться в навигации рядом с названием сайта (текст или эмодзи, до 10 символов)
          </p>
        </div>

        {/* Выбор темы */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-3 text-white">
            Тема оформления (для всех пользователей)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {themes.map((option) => {
              const Icon = getThemeIcon(option.icon);
              const isActive = theme === option.value;
              
              return (
                <button
                  key={option.value}
                  onClick={() => setTheme(option.value as any)}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    isActive
                      ? "border-current shadow-lg scale-105"
                      : "border-gray-700 hover:border-gray-600"
                  }`}
                  style={{
                    background: isActive 
                      ? `linear-gradient(135deg, ${option.color}20, ${option.color}10)`
                      : "rgba(255, 255, 255, 0.03)",
                    borderColor: isActive ? option.color : undefined,
                    boxShadow: isActive ? `0 0 20px ${option.color}30` : undefined,
                  }}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div 
                      className="flex items-center justify-center w-10 h-10 rounded-lg"
                      style={{ 
                        backgroundColor: isActive ? option.color + "20" : "transparent",
                        color: option.color
                      }}
                    >
                      {Icon}
                    </div>
                    <div>
                      <div className="font-semibold text-white">{option.label}</div>
                      <div className="text-xs text-gray-400">{option.description}</div>
                    </div>
                  </div>
                  {isActive && NI && (
                    <div className="flex items-center gap-1 text-xs" style={{ color: option.color }}>
                      <NI.Check className="w-4 h-4" />
                      <span>Активна</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Включенные функции */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-3 text-white">
            Включенные функции
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {Object.entries(featureLabels).map(([key, label]) => (
              <label
                key={key}
                className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all ${
                  (features as any)[key]
                    ? "border-red-500/30 bg-red-500/10"
                    : "border-gray-700 hover:border-gray-600 bg-white/2"
                }`}
              >
                <input
                  type="checkbox"
                  checked={(features as any)[key]}
                  onChange={(e) =>
                    setFeatures((prev) => ({ ...prev, [key]: e.target.checked }))
                  }
                  className="w-5 h-5 rounded border-gray-600 text-red-600 focus:ring-red-500 focus:ring-2"
                />
                <span className="text-sm font-medium text-white flex-1">{label}</span>
                {(features as any)[key] && NI && (
                  <NI.Check className="w-4 h-4 text-red-400" />
                )}
              </label>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Отключенные функции будут скрыты из навигации для всех пользователей
          </p>
        </div>

        {/* Настройки расчетного листа */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-3 text-white">
            Настройки расчетного листа
          </label>
          
          <div className="space-y-4">
            {/* Показывать печать */}
            <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-700">
              <input
                type="checkbox"
                checked={payslipSettings.payslipShowStamp}
                onChange={(e) =>
                  setPayslipSettings((prev) => ({ ...prev, payslipShowStamp: e.target.checked }))
                }
                className="w-5 h-5 rounded border-gray-600"
              />
              <div className="flex-1">
                <label className="text-sm font-medium text-white cursor-pointer">
                  Показывать печать на расчетном листе
                </label>
                <p className="text-xs text-gray-400 mt-1">
                  Включает/выключает отображение печати в правом нижнем углу листа
                </p>
              </div>
            </div>

            {/* Цвет обводки */}
            <div className="p-3 rounded-lg border border-gray-700">
              <label className="block text-sm font-medium mb-2 text-white">
                Цвет обводки листа
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={payslipSettings.payslipBorderColor}
                  onChange={(e) =>
                    setPayslipSettings((prev) => ({ ...prev, payslipBorderColor: e.target.value }))
                  }
                  className="w-16 h-10 rounded border border-gray-600 cursor-pointer"
                />
                <input
                  type="text"
                  value={payslipSettings.payslipBorderColor}
                  onChange={(e) =>
                    setPayslipSettings((prev) => ({ ...prev, payslipBorderColor: e.target.value }))
                  }
                  className="flex-1 border rounded px-3 py-2 bg-gray-900 text-white border-gray-700 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                  placeholder="#000000"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Цвет рамки вокруг расчетного листа (HEX формат)
              </p>
            </div>

            {/* Водяной знак */}
            <div className="p-3 rounded-lg border border-gray-700">
              <label className="block text-sm font-medium mb-2 text-white">
                Водяной знак
              </label>
              <input
                type="text"
                value={payslipSettings.payslipWatermark}
                onChange={(e) =>
                  setPayslipSettings((prev) => ({ ...prev, payslipWatermark: e.target.value }))
                }
                className="w-full border rounded px-3 py-2 bg-gray-900 text-white border-gray-700 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                placeholder="Введите текст водяного знака (оставьте пустым, чтобы отключить)"
              />
              <p className="text-xs text-gray-400 mt-1">
                Текст водяного знака, который будет отображаться на фоне расчетного листа
              </p>
            </div>

            {/* Загрузка печати */}
            <div className="p-3 rounded-lg border border-gray-700">
              <label className="block text-sm font-medium mb-2 text-white">
                Печать (PNG)
              </label>
              <div className="flex items-center gap-3 mb-2">
                {payslipSettings.payslipStampImage && (
                  <div className="flex-shrink-0">
                    <img
                      src={payslipSettings.payslipStampImage}
                      alt="Печать"
                      className="w-24 h-24 object-contain border border-gray-700 rounded"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/pechat.png";
                      }}
                    />
                  </div>
                )}
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/png"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      
                      setUploadingStamp(true);
                      try {
                        const formData = new FormData();
                        formData.append("file", file);
                        
                        const res = await fetch("/api/site-settings/upload-stamp", {
                          method: "POST",
                          body: formData,
                        });
                        
                        if (!res.ok) throw new Error("Ошибка при загрузке печати");
                        
                        const data = await res.json();
                        setPayslipSettings((prev) => ({ ...prev, payslipStampImage: data.path }));
                        showSuccess("Печать загружена!");
                        mutate();
                      } catch (error) {
                        alert("Ошибка при загрузке печати");
                      } finally {
                        setUploadingStamp(false);
                      }
                    }}
                    className="hidden"
                    id="stamp-upload"
                    disabled={uploadingStamp}
                  />
                  <label
                    htmlFor="stamp-upload"
                    className={`btn-ghost text-sm px-3 py-2 cursor-pointer inline-block ${
                      uploadingStamp ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  >
                    {uploadingStamp ? "Загрузка..." : "Загрузить печать (PNG)"}
                  </label>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Загрузите изображение печати в формате PNG. Рекомендуемый размер: 200x200px
              </p>
            </div>
          </div>
        </div>

        {/* Управление ролями */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-white">
              Управление ролями
            </label>
            <button
              onClick={() => setShowRoles(!showRoles)}
              className="btn-ghost text-sm px-3 py-1"
            >
              {showRoles ? "Скрыть" : "Показать"} роли
            </button>
          </div>
          {showRoles && (
            <RolesManager roles={roles || []} mutateRoles={mutateRoles} />
          )}
        </div>

        {/* Кнопка сохранения */}
        <div className="flex justify-end gap-3 pt-4 border-t" style={{ borderColor: "rgba(255, 255, 255, 0.1)" }}>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {NI ? <NI.Save className="w-4 h-4" /> : "💾"} 
            {saving ? "Сохранение..." : "Сохранить настройки"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Компонент для управления ролями
function RolesManager({ roles, mutateRoles }: { roles: any[]; mutateRoles: () => void }) {
  const [showPermissions, setShowPermissions] = useState<string | null>(null);
  const { showSuccess } = useSuccess();
  const NI = useNextIcons();

  // Список всех страниц
  const pages = [
    { key: "employees", label: "Сотрудники" },
    { key: "shifts", label: "Смены" },
    { key: "salaries", label: "Зарплаты" },
    { key: "reports", label: "Отчеты" },
    { key: "debts", label: "Долги" },
    { key: "shortages", label: "Недостачи" },
    { key: "tasks", label: "Задачи" },
    { key: "products", label: "Товары" },
    { key: "payments", label: "Выплаты" },
    { key: "memos", label: "Заметки" },
    { key: "lostItems", label: "Забытые вещи" },
    { key: "checklist", label: "Чек-лист" },
    { key: "pcManagement", label: "Управление ПК" },
    { key: "productOrder", label: "Заказы товаров" },
    { key: "langame", label: "Langame" },
    { key: "telegram", label: "Telegram" },
  ];

  // Список всех действий
  const actions = [
    { key: "view", label: "Просмотр" },
    { key: "create", label: "Создание" },
    { key: "edit", label: "Редактирование" },
    { key: "delete", label: "Удаление" },
  ];

  // Области действия
  const scopes = [
    { key: "all", label: "Все записи" },
    { key: "own", label: "Только свои" },
    { key: "none", label: "Нет доступа" },
  ];

  const [showCreateRoleModal, setShowCreateRoleModal] = useState(false);
  const [showEditRoleModal, setShowEditRoleModal] = useState<string | null>(null);
  const [newRole, setNewRole] = useState({
    name: "",
    nameRu: "",
    description: "",
  });
  const [editingRole, setEditingRole] = useState<any>(null);
  const [creatingRole, setCreatingRole] = useState(false);
  const [updatingRole, setUpdatingRole] = useState(false);

  const handleCreateRole = async () => {
    if (!newRole.name.trim() || !newRole.nameRu.trim()) {
      alert("Заполните название роли на английском и русском");
      return;
    }

    setCreatingRole(true);
    try {
      const res = await fetch("/api/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newRole.name.trim(),
          nameRu: newRole.nameRu.trim(),
          description: newRole.description.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Ошибка при создании роли");
      }
      showSuccess("Роль создана!");
      setShowCreateRoleModal(false);
      setNewRole({ name: "", nameRu: "", description: "" });
      mutateRoles();
    } catch (error: any) {
      alert(error.message || "Ошибка при создании роли");
    } finally {
      setCreatingRole(false);
    }
  };

  const handleEditRole = (role: any) => {
    setEditingRole({
      id: role.id,
      name: role.name,
      nameRu: role.nameRu,
      description: role.description || "",
    });
    setShowEditRoleModal(role.id);
  };

  const handleUpdateRole = async () => {
    if (!editingRole.name.trim() || !editingRole.nameRu.trim()) {
      alert("Заполните название роли на английском и русском");
      return;
    }

    setUpdatingRole(true);
    try {
      const res = await fetch(`/api/roles/${editingRole.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingRole.name.trim(),
          nameRu: editingRole.nameRu.trim(),
          description: editingRole.description.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Ошибка при обновлении роли");
      }
      showSuccess("Роль обновлена!");
      setShowEditRoleModal(null);
      setEditingRole(null);
      mutateRoles();
    } catch (error: any) {
      alert(error.message || "Ошибка при обновлении роли");
    } finally {
      setUpdatingRole(false);
    }
  };

  const handleDeleteRole = async (roleId: string, roleName: string) => {
    if (!confirm(`Вы уверены, что хотите удалить роль "${roleName}"?`)) return;
    try {
      const res = await fetch(`/api/roles/${roleId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Ошибка при удалении роли");
      showSuccess("Роль удалена!");
      mutateRoles();
    } catch (error) {
      alert("Ошибка при удалении роли");
    }
  };

  const handleSavePermission = async (roleId: string, page: string, action: string, scope: string, granted: boolean) => {
    try {
      const res = await fetch(`/api/roles/${roleId}/permissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page, action, scope, granted }),
      });
      if (!res.ok) throw new Error("Ошибка при сохранении права");
      mutateRoles();
    } catch (error) {
      alert("Ошибка при сохранении права");
    }
  };

  return (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button 
              onClick={() => setShowCreateRoleModal(true)} 
              className="btn-primary text-sm px-4 py-2 flex items-center gap-2 hover:opacity-90 transition-opacity"
            >
              {NI ? <NI.Plus className="w-4 h-4" /> : "+"} Создать роль
            </button>
          </div>

      <div className="space-y-3">
        {Array.isArray(roles) && roles.length > 0 ? roles.map((role) => (
          <div key={role.id} className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-semibold text-white">{role.nameRu} ({role.name})</h3>
                {role.description && (
                  <p className="text-xs text-gray-400 mt-1">{role.description}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Пользователей: {role._count?.users || 0}, Сотрудников: {role._count?.employees || 0}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEditRole(role)}
                  className="btn-ghost text-sm px-3 py-1 flex items-center gap-1"
                >
                  {NI ? <NI.Edit className="w-4 h-4" /> : "✏️"} Редактировать
                </button>
                <button
                  onClick={() => setShowPermissions(showPermissions === role.id ? null : role.id)}
                  className="btn-ghost text-sm px-3 py-1"
                >
                  {showPermissions === role.id ? "Скрыть" : "Показать"} права
                </button>
                {!role.isSystem && (
                  <button
                    onClick={() => handleDeleteRole(role.id, role.nameRu)}
                    className="btn-ghost text-sm px-3 py-1 text-red-500 hover:text-red-400 flex items-center gap-1"
                  >
                    {NI ? <NI.Trash className="w-4 h-4" /> : "🗑️"} Удалить
                  </button>
                )}
              </div>
            </div>

            {showPermissions === role.id && (
              <div className="mt-4 pt-4 border-t" style={{ borderColor: "rgba(255, 255, 255, 0.1)" }}>
                <div className="space-y-4">
                  {pages.map((page) => (
                    <div key={page.key} className="space-y-2">
                      <h4 className="text-sm font-medium text-white">{page.label}</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {actions.map((action) => {
                          const permission = role.permissions?.find(
                            (p: any) => p.page === page.key && p.action === action.key
                          );
                          const currentScope = permission?.scope || "none";
                          const isGranted = permission?.granted ?? false;

                          return (
                            <div key={action.key} className="flex flex-col gap-1">
                              <label className="flex items-center gap-2 text-xs">
                                <input
                                  type="checkbox"
                                  checked={isGranted}
                                  onChange={(e) =>
                                    handleSavePermission(
                                      role.id,
                                      page.key,
                                      action.key,
                                      currentScope,
                                      e.target.checked
                                    )
                                  }
                                  className="w-4 h-4 rounded border-gray-600"
                                />
                                <span className="text-white">{action.label}</span>
                              </label>
                              {isGranted && (
                                <select
                                  value={currentScope}
                                  onChange={(e) =>
                                    handleSavePermission(
                                      role.id,
                                      page.key,
                                      action.key,
                                      e.target.value,
                                      true
                                    )
                                  }
                                  className="text-xs border rounded px-2 py-1 bg-gray-900 text-white border-gray-700"
                                >
                                  {scopes.map((scope) => (
                                    <option key={scope.key} value={scope.key}>
                                      {scope.label}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )) : (
          <div className="card p-4 text-center text-gray-400">
            <p>Роли не найдены. Создайте первую роль.</p>
          </div>
        )}
      </div>

      {/* Модальное окно редактирования роли */}
      {showEditRoleModal && editingRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="card p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Редактировать роль</h2>
              <button
                onClick={() => {
                  setShowEditRoleModal(null);
                  setEditingRole(null);
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                {NI ? <NI.X className="w-5 h-5" /> : "✕"}
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-white">
                  Название роли (английский) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editingRole.name}
                  onChange={(e) => setEditingRole((prev: any) => ({ ...prev, name: e.target.value }))}
                  placeholder="Например: manager, cashier"
                  className="w-full border rounded px-3 py-2 bg-gray-900 text-white border-gray-700 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Используется для идентификации роли в системе
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-white">
                  Название роли (русский) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editingRole.nameRu}
                  onChange={(e) => setEditingRole((prev: any) => ({ ...prev, nameRu: e.target.value }))}
                  placeholder="Например: Менеджер, Кассир"
                  className="w-full border rounded px-3 py-2 bg-gray-900 text-white border-gray-700 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Отображается пользователям в интерфейсе
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-white">
                  Описание роли
                </label>
                <textarea
                  value={editingRole.description}
                  onChange={(e) => setEditingRole((prev: any) => ({ ...prev, description: e.target.value }))}
                  placeholder="Краткое описание роли и её назначения (необязательно)"
                  rows={3}
                  className="w-full border rounded px-3 py-2 bg-gray-900 text-white border-gray-700 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none resize-none"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Поможет понять назначение роли
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t" style={{ borderColor: "rgba(255, 255, 255, 0.1)" }}>
              <button
                onClick={() => {
                  setShowEditRoleModal(null);
                  setEditingRole(null);
                }}
                className="btn-ghost px-4 py-2"
                disabled={updatingRole}
              >
                Отмена
              </button>
              <button
                onClick={handleUpdateRole}
                disabled={updatingRole || !editingRole.name.trim() || !editingRole.nameRu.trim()}
                className="btn-primary px-4 py-2 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updatingRole ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    Обновление...
                  </>
                ) : (
                  <>
                    {NI ? <NI.Save className="w-4 h-4" /> : "💾"} Сохранить изменения
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно создания роли */}
      {showCreateRoleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="card p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Создать новую роль</h2>
              <button
                onClick={() => {
                  setShowCreateRoleModal(false);
                  setNewRole({ name: "", nameRu: "", description: "" });
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                {NI ? <NI.X className="w-5 h-5" /> : "✕"}
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-white">
                  Название роли (английский) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newRole.name}
                  onChange={(e) => setNewRole((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Например: manager, cashier"
                  className="w-full border rounded px-3 py-2 bg-gray-900 text-white border-gray-700 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Используется для идентификации роли в системе
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-white">
                  Название роли (русский) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newRole.nameRu}
                  onChange={(e) => setNewRole((prev) => ({ ...prev, nameRu: e.target.value }))}
                  placeholder="Например: Менеджер, Кассир"
                  className="w-full border rounded px-3 py-2 bg-gray-900 text-white border-gray-700 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Отображается пользователям в интерфейсе
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-white">
                  Описание роли
                </label>
                <textarea
                  value={newRole.description}
                  onChange={(e) => setNewRole((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Краткое описание роли и её назначения (необязательно)"
                  rows={3}
                  className="w-full border rounded px-3 py-2 bg-gray-900 text-white border-gray-700 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none resize-none"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Поможет понять назначение роли
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t" style={{ borderColor: "rgba(255, 255, 255, 0.1)" }}>
              <button
                onClick={() => {
                  setShowCreateRoleModal(false);
                  setNewRole({ name: "", nameRu: "", description: "" });
                }}
                className="btn-ghost px-4 py-2"
                disabled={creatingRole}
              >
                Отмена
              </button>
              <button
                onClick={handleCreateRole}
                disabled={creatingRole || !newRole.name.trim() || !newRole.nameRu.trim()}
                className="btn-primary px-4 py-2 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creatingRole ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    Создание...
                  </>
                ) : (
                  <>
                    {NI ? <NI.Check className="w-4 h-4" /> : "✓"} Создать роль
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
