"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNextIcons } from "./NI";

interface DraggableCalculatorProps {
  onValueChange?: (value: string) => void;
  initialValue?: string;
  onClose?: () => void;
}

export default function DraggableCalculator({ onValueChange, initialValue = "0", onClose }: DraggableCalculatorProps) {
  const NI = useNextIcons();
  const [calcValue, setCalcValue] = useState(initialValue);
  const [calcHistory, setCalcHistory] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ width: 240, height: 320 });
  const [isMinimized, setIsMinimized] = useState(false);
  const dragRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef<HTMLDivElement>(null);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const resizeStartPos = useRef({ x: 0, y: 0, width: 0, height: 0 });

  // Загружаем сохраненные данные из localStorage
  useEffect(() => {
    const savedPosition = localStorage.getItem("calculator_position");
    const savedHistory = localStorage.getItem("calculator_history");
    const savedValue = localStorage.getItem("calculator_value");
    const savedMinimized = localStorage.getItem("calculator_minimized");
    const savedSize = localStorage.getItem("calculator_size");

    if (savedPosition) {
      try {
        const pos = JSON.parse(savedPosition);
        setPosition(pos);
      } catch (e) {
        console.error("Error loading calculator position:", e);
      }
    } else {
      // Позиция по умолчанию (центр экрана)
      setPosition({ x: window.innerWidth / 2 - 120, y: window.innerHeight / 2 - 160 });
    }

    if (savedSize) {
      try {
        const s = JSON.parse(savedSize);
        setSize(s);
      } catch (e) {
        console.error("Error loading calculator size:", e);
      }
    }

    if (savedHistory) {
      try {
        setCalcHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Error loading calculator history:", e);
      }
    }

    if (savedValue) {
      setCalcValue(savedValue);
    }

    if (savedMinimized === "true") {
      setIsMinimized(true);
    }
  }, []);

  // Сохраняем данные в localStorage при изменении
  useEffect(() => {
    localStorage.setItem("calculator_position", JSON.stringify(position));
  }, [position]);

  useEffect(() => {
    localStorage.setItem("calculator_size", JSON.stringify(size));
  }, [size]);

  useEffect(() => {
    localStorage.setItem("calculator_history", JSON.stringify(calcHistory));
  }, [calcHistory]);

  useEffect(() => {
    localStorage.setItem("calculator_value", calcValue);
  }, [calcValue]);

  useEffect(() => {
    localStorage.setItem("calculator_minimized", String(isMinimized));
  }, [isMinimized]);

  // Обработка начала перетаскивания
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    if ((e.target as HTMLElement).closest(".resize-handle")) return;
    setIsDragging(true);
    const rect = dragRef.current?.getBoundingClientRect();
    if (rect) {
      dragStartPos.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  }, []);

  // Обработка начала изменения размера
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizing(true);
    if (dragRef.current) {
      const rect = dragRef.current.getBoundingClientRect();
      resizeStartPos.current = {
        x: e.clientX,
        y: e.clientY,
        width: rect.width,
        height: rect.height,
      };
    }
  }, []);

  // Обработка движения мыши при перетаскивании
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newX = e.clientX - dragStartPos.current.x;
      const newY = e.clientY - dragStartPos.current.y;

      // Ограничиваем перемещение в пределах экрана
      const maxX = window.innerWidth - (dragRef.current?.offsetWidth || 0);
      const maxY = window.innerHeight - (dragRef.current?.offsetHeight || 0);

      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  // Обработка изменения размера
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - resizeStartPos.current.x;
      const deltaY = e.clientY - resizeStartPos.current.y;

      const newWidth = Math.max(200, Math.min(400, resizeStartPos.current.width + deltaX));
      const newHeight = Math.max(250, Math.min(500, resizeStartPos.current.height + deltaY));

      setSize({ width: newWidth, height: newHeight });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  // Обработка касаний для мобильных устройств
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    if ((e.target as HTMLElement).closest(".resize-handle")) return;
    const touch = e.touches[0];
    setIsDragging(true);
    const rect = dragRef.current?.getBoundingClientRect();
    if (rect) {
      dragStartPos.current = {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    }
  }, []);

  const handleCalcNum = (num: string) => {
    setCalcValue((prev) => {
      if (prev === "0") return num;
      return prev + num;
    });
  };

  const handleCalcOp = (op: string) => {
    setCalcValue((prev) => {
      if (prev.endsWith("+") || prev.endsWith("-") || prev.endsWith("*") || prev.endsWith("/")) {
        return prev.slice(0, -1) + op;
      }
      return prev + op;
    });
  };

  const handleCalcDot = () => {
    setCalcValue((prev) => {
      const parts = prev.split(/[+\-*/]/);
      const lastPart = parts[parts.length - 1];
      if (!lastPart.includes(".") && !lastPart.includes(",")) {
        return prev + ".";
      }
      return prev;
    });
  };

  const handleCalcEqual = () => {
    try {
      const expression = calcValue.replace(/,/g, ".").replace(/×/g, "*").replace(/÷/g, "/");
      const result = Function(`"use strict"; return (${expression})`)();
      const formattedResult = String(result).replace(/\./g, ",");
      setCalcHistory((prev) => [...prev.slice(-9), `${calcValue} = ${formattedResult}`]);
      setCalcValue(formattedResult);
      if (onValueChange) {
        onValueChange(formattedResult);
      }
    } catch (error) {
      setCalcValue("Ошибка");
      setTimeout(() => setCalcValue("0"), 1000);
    }
  };

  const handleClear = () => {
    setCalcValue("0");
  };

  const handleBackspace = () => {
    setCalcValue((prev) => {
      if (prev.length <= 1) return "0";
      return prev.slice(0, -1);
    });
  };

  // Вычисляем размеры кнопок и шрифтов в зависимости от размера калькулятора
  const scale = Math.min(size.width / 240, size.height / 320);
  const buttonPadding = Math.max(8, Math.min(12, 10 * scale));
  const fontSize = Math.max(12, Math.min(16, 14 * scale));
  const displayFontSize = Math.max(20, Math.min(32, 24 * scale));

  // Создаем контент для minimized версии
  const minimizedContent = (
    <div
      ref={dragRef}
      style={{
        position: "fixed",
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 2147483647,
        cursor: isDragging ? "grabbing" : "grab",
        pointerEvents: "auto",
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      className="bg-gray-800 rounded-lg shadow-2xl border border-gray-700 p-2 select-none"
    >
      <button
        onClick={() => setIsMinimized(false)}
        className="text-white hover:text-blue-400 transition-colors"
      >
        {NI?.Calculator ? <NI.Calculator className="w-5 h-5" /> : "🧮"}
      </button>
    </div>
  );

  // Создаем контент для полной версии
  const calculatorContent = (
    <div
      ref={dragRef}
      style={{
        position: "fixed",
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
        zIndex: 2147483647,
        cursor: isDragging ? "grabbing" : "default",
        pointerEvents: "auto",
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      className="bg-gray-900 rounded-lg shadow-2xl border border-gray-700 p-3 select-none flex flex-col"
    >
      {/* Минималистичный заголовок */}
      <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-700">
        <span className="text-white text-xs font-medium">Калькулятор</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMinimized(true)}
            className="text-gray-400 hover:text-white transition-colors text-xs"
            title="Свернуть"
          >
            {NI?.Minus ? <NI.Minus className="w-3 h-3" /> : "−"}
          </button>
          <button
            onClick={() => {
              setCalcValue("0");
              setCalcHistory([]);
              if (onClose) {
                onClose();
              }
            }}
            className="text-gray-400 hover:text-red-400 transition-colors text-xs"
            title="Закрыть"
          >
            {NI?.X ? <NI.X className="w-3 h-3" /> : "✕"}
          </button>
        </div>
      </div>

      {/* История вычислений (скрыта для минимализма) */}
      {calcHistory.length > 0 && (
        <div className="mb-1 max-h-12 overflow-y-auto space-y-0.5">
          {calcHistory.slice(-1).map((item, idx) => (
            <div key={idx} className="text-xs text-gray-500 text-right font-mono">
              {item}
            </div>
          ))}
        </div>
      )}

      {/* Дисплей */}
      <div className="bg-black rounded p-2 mb-2 min-h-[50px] flex items-end justify-end">
        <div className="text-white font-mono text-right break-all" style={{ fontSize: `${displayFontSize}px` }}>
          {calcValue}
        </div>
      </div>

      {/* Кнопка вставки значения */}
      {onValueChange && (
        <button
          onClick={() => {
            if (onValueChange) {
              onValueChange(calcValue);
            }
          }}
          className="w-full mb-2 px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 active:scale-95 transition-all text-xs font-medium"
        >
          Вставить
        </button>
      )}

      {/* Кнопки калькулятора */}
      <div className="grid grid-cols-4 gap-1.5 flex-1">
        {/* Первая строка */}
        <button
          onClick={handleClear}
          className="rounded bg-gray-700 text-white hover:bg-gray-600 active:scale-95 transition-all font-medium"
          style={{ padding: `${buttonPadding}px`, fontSize: `${fontSize}px` }}
        >
          C
        </button>
        <button
          onClick={handleBackspace}
          className="rounded bg-gray-700 text-white hover:bg-gray-600 active:scale-95 transition-all"
          style={{ padding: `${buttonPadding}px`, fontSize: `${fontSize}px` }}
        >
          ⌫
        </button>
        <button
          onClick={() => handleCalcOp("/")}
          className="rounded bg-orange-600 text-white hover:bg-orange-700 active:scale-95 transition-all font-medium"
          style={{ padding: `${buttonPadding}px`, fontSize: `${fontSize}px` }}
        >
          ÷
        </button>
        <button
          onClick={() => handleCalcOp("*")}
          className="rounded bg-orange-600 text-white hover:bg-orange-700 active:scale-95 transition-all font-medium"
          style={{ padding: `${buttonPadding}px`, fontSize: `${fontSize}px` }}
        >
          ×
        </button>

        {/* Вторая строка */}
        <button
          onClick={() => handleCalcNum("7")}
          className="rounded bg-gray-800 text-white hover:bg-gray-700 active:scale-95 transition-all font-medium"
          style={{ padding: `${buttonPadding}px`, fontSize: `${fontSize}px` }}
        >
          7
        </button>
        <button
          onClick={() => handleCalcNum("8")}
          className="rounded bg-gray-800 text-white hover:bg-gray-700 active:scale-95 transition-all font-medium"
          style={{ padding: `${buttonPadding}px`, fontSize: `${fontSize}px` }}
        >
          8
        </button>
        <button
          onClick={() => handleCalcNum("9")}
          className="rounded bg-gray-800 text-white hover:bg-gray-700 active:scale-95 transition-all font-medium"
          style={{ padding: `${buttonPadding}px`, fontSize: `${fontSize}px` }}
        >
          9
        </button>
        <button
          onClick={() => handleCalcOp("-")}
          className="rounded bg-orange-600 text-white hover:bg-orange-700 active:scale-95 transition-all font-medium"
          style={{ padding: `${buttonPadding}px`, fontSize: `${fontSize}px` }}
        >
          −
        </button>

        {/* Третья строка */}
        <button
          onClick={() => handleCalcNum("4")}
          className="rounded bg-gray-800 text-white hover:bg-gray-700 active:scale-95 transition-all font-medium"
          style={{ padding: `${buttonPadding}px`, fontSize: `${fontSize}px` }}
        >
          4
        </button>
        <button
          onClick={() => handleCalcNum("5")}
          className="rounded bg-gray-800 text-white hover:bg-gray-700 active:scale-95 transition-all font-medium"
          style={{ padding: `${buttonPadding}px`, fontSize: `${fontSize}px` }}
        >
          5
        </button>
        <button
          onClick={() => handleCalcNum("6")}
          className="rounded bg-gray-800 text-white hover:bg-gray-700 active:scale-95 transition-all font-medium"
          style={{ padding: `${buttonPadding}px`, fontSize: `${fontSize}px` }}
        >
          6
        </button>
        <button
          onClick={() => handleCalcOp("+")}
          className="rounded bg-orange-600 text-white hover:bg-orange-700 active:scale-95 transition-all font-medium"
          style={{ padding: `${buttonPadding}px`, fontSize: `${fontSize}px` }}
        >
          +
        </button>

        {/* Четвертая строка */}
        <button
          onClick={() => handleCalcNum("1")}
          className="rounded bg-gray-800 text-white hover:bg-gray-700 active:scale-95 transition-all font-medium"
          style={{ padding: `${buttonPadding}px`, fontSize: `${fontSize}px` }}
        >
          1
        </button>
        <button
          onClick={() => handleCalcNum("2")}
          className="rounded bg-gray-800 text-white hover:bg-gray-700 active:scale-95 transition-all font-medium"
          style={{ padding: `${buttonPadding}px`, fontSize: `${fontSize}px` }}
        >
          2
        </button>
        <button
          onClick={() => handleCalcNum("3")}
          className="rounded bg-gray-800 text-white hover:bg-gray-700 active:scale-95 transition-all font-medium"
          style={{ padding: `${buttonPadding}px`, fontSize: `${fontSize}px` }}
        >
          3
        </button>
        <button
          onClick={handleCalcEqual}
          className="rounded bg-green-600 text-white hover:bg-green-700 active:scale-95 transition-all font-medium row-span-2"
          style={{ padding: `${buttonPadding}px`, fontSize: `${fontSize}px` }}
        >
          =
        </button>

        {/* Пятая строка */}
        <button
          onClick={() => handleCalcNum("0")}
          className="rounded bg-gray-800 text-white hover:bg-gray-700 active:scale-95 transition-all font-medium col-span-2"
          style={{ padding: `${buttonPadding}px`, fontSize: `${fontSize}px` }}
        >
          0
        </button>
        <button
          onClick={handleCalcDot}
          className="rounded bg-gray-800 text-white hover:bg-gray-700 active:scale-95 transition-all font-medium"
          style={{ padding: `${buttonPadding}px`, fontSize: `${fontSize}px` }}
        >
          ,
        </button>
      </div>

      {/* Handle для изменения размера */}
      <div
        ref={resizeRef}
        onMouseDown={handleResizeStart}
        className="resize-handle absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize bg-gray-700 hover:bg-gray-600 rounded-tl-lg"
        style={{
          clipPath: "polygon(100% 0, 0 100%, 100% 100%)",
        }}
      />
    </div>
  );

  // Используем портал для рендеринга напрямую в body
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  // Рендерим через портал в body
  return createPortal(
    isMinimized ? minimizedContent : calculatorContent,
    document.body
  );
}
