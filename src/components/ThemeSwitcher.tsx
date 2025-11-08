"use client";
import React, { useState, useEffect } from "react";
import { useSiteSettings } from "./SiteSettingsProvider";
import { useSession } from "next-auth/react";
import { useNextIcons } from "./NI";

export default function ThemeSwitcher() {
  const { settings, mutate } = useSiteSettings();
  const { data: session } = useSession();
  const NI = useNextIcons();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  const isDirector = (session?.user as any)?.role === "DIRECTOR";
  const currentTheme = settings?.theme || "dark";

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

  const currentThemeData = themes.find((t) => t.value === currentTheme) || themes[0];

  // Закрываем меню при клике вне его
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleThemeChange = async (theme: string) => {
    if (!isDirector) {
      alert("Только директор может менять тему сайта");
      return;
    }

    try {
      const res = await fetch("/api/site-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme }),
      });

      if (!res.ok) throw new Error("Ошибка при сохранении темы");
      
      mutate();
      setIsOpen(false);
    } catch (error: any) {
      console.error("Error changing theme:", error);
      alert(`Ошибка: ${error.message}`);
    }
  };

  const getThemeIcon = (iconName: string) => {
    if (!NI) return null;
    switch (iconName) {
      case "Moon": return <NI.Moon className="w-5 h-5" />;
      case "Sun": return <NI.Sun className="w-5 h-5" />;
      case "Droplet": return <NI.Droplet className="w-5 h-5" />;
      case "Palette": return <NI.Palette className="w-5 h-5" />;
      case "Sparkles": return <NI.Sparkles className="w-5 h-5" />;
      default: return null;
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-white/10 transition-all text-white flex items-center justify-center"
        aria-label="Переключить тему"
        title="Переключить тему"
        style={{ 
          color: currentThemeData.color,
        }}
      >
        {getThemeIcon(currentThemeData.icon)}
      </button>

      {isOpen && (
        <div className="absolute left-full ml-2 bottom-0 w-64 bg-black border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
          <div className="p-3 border-b border-gray-700 bg-gradient-to-r from-red-500/10 to-transparent">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              {NI && <NI.Palette className="w-4 h-4" />}
              Выбор темы
            </h3>
            {!isDirector && (
              <p className="text-xs text-gray-400 mt-1">
                Только директор может менять тему
              </p>
            )}
          </div>
          <div className="p-2">
            {themes.map((theme) => {
              const Icon = getThemeIcon(theme.icon);
              const isActive = currentTheme === theme.value;
              
              return (
                <button
                  key={theme.value}
                  onClick={() => handleThemeChange(theme.value)}
                  disabled={!isDirector}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm transition-all mb-1 ${
                    isActive
                      ? "bg-gradient-to-r from-red-500/20 to-red-500/10 text-white border border-red-500/30 shadow-lg"
                      : "text-gray-300 hover:bg-white/5 hover:text-white"
                  } ${!isDirector ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                  style={isActive ? { 
                    borderColor: theme.color + "50",
                    boxShadow: `0 0 12px ${theme.color}30`
                  } : {}}
                >
                  <div 
                    className="flex items-center justify-center w-8 h-8 rounded-lg"
                    style={{ 
                      backgroundColor: isActive ? theme.color + "20" : "transparent",
                      color: theme.color
                    }}
                  >
                    {Icon}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-medium">{theme.label}</div>
                    <div className="text-xs text-gray-400">{theme.description}</div>
                  </div>
                  {isActive && NI && (
                    <NI.Check className="w-5 h-5" style={{ color: theme.color }} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
