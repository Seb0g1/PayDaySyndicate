"use client";
import useSWR from "swr";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useNextIcons } from "@/components/NI";
import { useSession } from "next-auth/react";
import { useSuccess } from "@/components/SuccessProvider";
import { useSiteSettings } from "@/components/SiteSettingsProvider";

type Row = {
  employee: { id: string; name: string };
  totalHours: number;
  totalShifts: number;
  gross: number;
  debtAmount: number;
  shortageAmt: number;
  net: number;
  shifts?: { date: string; type: string }[];
  shortages?: { name: string; qty: number; price: number }[];
  unassignedDetails?: { name: string; qty: number; price: number }[];
  debts?: { name: string; qty: number; price: number; amount: number }[];
  unassignedShare?: number;
  penalties?: number;
  bonuses?: number;
  penaltiesList?: { amount: number; reason: string }[];
  bonusesList?: { amount: number; reason: string }[];
  hookah?: number;
};

const fetcher = async (u: string) => {
  try {
    const response = await fetch(u);
    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: errorText || `HTTP ${response.status}` };
      }
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }
    const text = await response.text();
    if (!text) {
      return [];
    }
    return JSON.parse(text);
  } catch (error: any) {
    console.error("Fetcher error:", error);
    throw error;
  }
};

export default function SalariesPage() {
  const NI = useNextIcons();
  const { data: session, status } = useSession();
  const { settings } = useSiteSettings();
  const role = ((session as any)?.user as any)?.role as string | undefined;
  const isDirector = role === "DIRECTOR" || role === "OWNER";
  
  // Показываем загрузку пока сессия загружается
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-white">Загрузка...</div>
      </div>
    );
  }

  const download = async (r: Row) => {
    const pdfLib = await import("@react-pdf/renderer");
    const { Document, Page, Text, View, StyleSheet, Image, pdf, Font } = pdfLib;
    try {
      Font.register({
        family: "NotoSans",
        fonts: [
          { src: "https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts/hinted/ttf/NotoSans/NotoSans-Regular.ttf", fontWeight: "normal" },
          { src: "https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts/hinted/ttf/NotoSans/NotoSans-Bold.ttf", fontWeight: "bold" },
        ],
      });
    } catch {}
    
    // Получаем настройки расчетного листа
    const borderColor = settings?.payslipBorderColor || "#000000";
    const showStamp = settings?.payslipShowStamp ?? true;
    const watermark = settings?.payslipWatermark || "";
    const stampImage = settings?.payslipStampImage || "/pechat.png";
    
    const styles = StyleSheet.create({
      page: { 
        padding: 28, 
        fontFamily: "NotoSans", 
        position: "relative",
        border: `2px solid ${borderColor}`,
        borderStyle: "solid",
      },
      header: { fontSize: 20, marginBottom: 16, fontWeight: 700, color: "#1a1a1a" },
      row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8, fontSize: 13 },
      label: { width: 160, color: "#4a4a4a", fontWeight: 500 },
      value: { flex: 1, textAlign: "right", color: "#1a1a1a", fontWeight: 600 },
      hr: { height: 1, backgroundColor: "#e5e7eb", marginVertical: 10 },
      stamp: { width: 120, position: "absolute", right: 24, bottom: 24, opacity: 0.85 },
      sectionTitle: { fontSize: 15, marginTop: 12, marginBottom: 8, fontWeight: 700, color: "#1a1a1a" },
      listItem: { fontSize: 11, marginBottom: 4, color: "#4a4a4a" },
      watermark: {
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%) rotate(-45deg)",
        fontSize: 48,
        color: "rgba(0, 0, 0, 0.05)",
        fontWeight: "bold",
        zIndex: 0,
      },
      content: {
        position: "relative",
        zIndex: 1,
      },
    });
    const fmtDate = (s: string) => new Date(s).toLocaleDateString("ru-RU");
    const fmt = (n: number) => n.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const doc = (
      <Document>
        <Page size="A4" style={styles.page}>
          {watermark && (
            <Text style={styles.watermark}>{watermark}</Text>
          )}
          <View style={styles.content}>
            <Text style={styles.header}>Расчётный лист</Text>
          <View style={styles.row}><Text style={styles.label}>Сотрудник</Text><Text style={styles.value}>{r.employee.name}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Период</Text><Text style={styles.value}>{fmtDate(start)} — {fmtDate(end)}</Text></View>
          <View style={styles.hr} />
          <View style={styles.row}><Text style={styles.label}>Часы</Text><Text style={styles.value}>{fmt(r.totalHours)}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Смены</Text><Text style={styles.value}>{r.totalShifts}</Text></View>
          <View style={styles.hr} />
          <View style={styles.row}><Text style={styles.label}>Начислено</Text><Text style={styles.value}>{fmt(Number(r.gross))} ₽</Text></View>
          <View style={styles.row}><Text style={styles.label}>Долги</Text><Text style={styles.value}>−{fmt(Number(r.debtAmount))} ₽</Text></View>
          <View style={styles.row}><Text style={styles.label}>Недостачи</Text><Text style={styles.value}>−{fmt(Number(r.shortageAmt))} ₽</Text></View>
          <View style={styles.row}><Text style={styles.label}>Штрафы</Text><Text style={styles.value}>−{fmt(Number(r.penalties || 0))} ₽</Text></View>
          <View style={styles.row}><Text style={styles.label}>Бонусы</Text><Text style={styles.value}>+{fmt(Number(r.bonuses || 0))} ₽</Text></View>
          <View style={styles.row}><Text style={styles.label}>Кальяны</Text><Text style={styles.value}>+{fmt(Number(r.hookah || 0))} ₽</Text></View>
          <View style={styles.hr} />
          <View style={styles.row}><Text style={styles.label}>Итого к выплате</Text><Text style={styles.value}>{fmt(Number(r.net))} ₽</Text></View>
          {Array.isArray(r.shifts) && r.shifts.length > 0 ? (
            <>
              <Text style={styles.sectionTitle}>Смены</Text>
              {r.shifts.map((s, i) => {
                const d = new Date(s.date);
                const typeRu = s.type === "NIGHT" ? "Ночь" : s.type === "MORNING" || s.type === "EVENING" ? "День" : "Другое";
                return <Text key={i} style={styles.listItem}>{d.toLocaleDateString("ru-RU")} — {typeRu}</Text>;
              })}
            </>
          ) : null}
          {Array.isArray(r.penaltiesList) && r.penaltiesList.length > 0 ? (
            <>
              <Text style={styles.sectionTitle}>Штрафы — детали</Text>
              {r.penaltiesList.map((p, i) => (
                <Text key={i} style={styles.listItem}>−{fmt(Number(p.amount))} ₽ — {p.reason}</Text>
              ))}
            </>
          ) : null}
          {Array.isArray(r.bonusesList) && r.bonusesList.length > 0 ? (
            <>
              <Text style={styles.sectionTitle}>Бонусы — детали</Text>
              {r.bonusesList.map((b, i) => (
                <Text key={i} style={styles.listItem}>+{fmt(Number(b.amount))} ₽ — {b.reason}</Text>
              ))}
            </>
          ) : null}
          {Array.isArray(r.debts) && r.debts.length > 0 ? (
            <>
              <Text style={styles.sectionTitle}>Долги</Text>
              {r.debts.map((d, i) => (
                <Text key={i} style={styles.listItem}>{d.name}: {d.qty} шт × {fmt(d.price)} ₽ = {fmt(d.amount)} ₽</Text>
              ))}
            </>
          ) : null}
          {Array.isArray(r.shortages) && r.shortages.length > 0 ? (
            <>
              <Text style={styles.sectionTitle}>Недостачи (назначенные)</Text>
              {r.shortages.map((s, i) => (
                <Text key={i} style={styles.listItem}>{s.name}: {s.qty} шт × {fmt(s.price)} ₽ = {fmt(s.qty * s.price)} ₽</Text>
              ))}
              {Number(r.unassignedShare || 0) > 0 ? (
                <Text style={styles.listItem}>Доля общих недостач: {fmt(Number(r.unassignedShare))} ₽</Text>
              ) : null}
            </>
          ) : null}
          </View>
          {showStamp && <Image src={stampImage} style={styles.stamp} />}
        </Page>
      </Document>
    );
    const blob = await pdf(doc).toBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `raschetnyi-list-${r.employee.name}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  // Полумесячные периоды: 1-15 и 16-конец
  const today = new Date();
  const first = new Date(today.getFullYear(), today.getMonth(), 1);
  const fifteenth = new Date(today.getFullYear(), today.getMonth(), 15);
  const sixteenth = new Date(today.getFullYear(), today.getMonth(), 16);
  const last = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const defaultStart = today.getDate() <= 15 ? first : sixteenth;
  const defaultEnd = today.getDate() <= 15 ? fifteenth : last;
  const [start, setStart] = useState(defaultStart.toISOString().slice(0, 10));
  const [end, setEnd] = useState(defaultEnd.toISOString().slice(0, 10));
  const [overrideUnassigned, setOverrideUnassigned] = useState<string>("");
  useEffect(() => {
    try { const v = localStorage.getItem("shortagesTotal") || ""; setOverrideUnassigned(v); } catch {}
  }, []);
  const [shareIds, setShareIds] = useState<string[]>([]);
  const { data, error, mutate, isLoading } = useSWR<Row[]>(`/api/salaries/calculate?start=${start}&end=${end}&share=${encodeURIComponent(shareIds.join(","))}&override=${encodeURIComponent(overrideUnassigned || "")}`, fetcher);
  
  useEffect(() => {
    if (error) {
      console.error("Ошибка загрузки зарплат:", error);
    }
  }, [error]);
  useEffect(() => {
    if (!data || role !== "DIRECTOR") return;
    if (shareIds.length === 0 && data.length > 0) setShareIds(data.map((r) => r.employee.id));
  }, [data, role]);

  const totalNet = useMemo(() => (data ?? []).reduce((acc, r) => acc + Number(r.net), 0), [data]);

  const createBatch = async () => {
    await fetch("/api/salaries/batch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ start, end }) });
    alert("Пакет создан в статусе Черновик");
  };
  const [batchId, setBatchId] = useState("");
  const finalizeBatch = async () => {
    if (!batchId) { alert("Введите ID пакета"); return; }
    await fetch("/api/salaries/batch", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ batchId, action: "FINALIZE" }) });
    alert("Пакет утверждён");
  };

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-red-500 to-red-600 bg-clip-text text-transparent">
          Зарплаты
        </h1>
        {data && data.length > 0 && (
          <div className="px-4 py-2 bg-gradient-to-r from-red-500/20 to-red-600/20 border border-red-500/30 rounded-lg">
            <span className="text-sm text-gray-300">Итого к выплате: </span>
            <span className="text-xl font-bold text-white">{totalNet.toFixed(2)} ₽</span>
          </div>
        )}
      </div>

      {/* Фильтры и настройки */}
      <div className="card p-6 bg-gradient-to-br from-gray-900/50 to-gray-800/50 border border-gray-700/50">
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          {NI && <NI.Calendar className="w-5 h-5 text-red-500" />}
          Период расчета
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
              {NI && <NI.Calendar className="w-4 h-4" />}
              Начало периода
            </label>
            <input 
              type="date" 
              value={start} 
              onChange={(e) => setStart(e.target.value)} 
              className="w-full border border-gray-700 rounded-lg px-4 py-2.5 bg-gray-900/50 text-white focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
              {NI && <NI.Calendar className="w-4 h-4" />}
              Конец периода
            </label>
            <input 
              type="date" 
              value={end} 
              onChange={(e) => setEnd(e.target.value)} 
              className="w-full border border-gray-700 rounded-lg px-4 py-2.5 bg-gray-900/50 text-white focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
              {NI && <NI.AlertTriangle className="w-4 h-4" />}
              Общая недостача
            </label>
            <input 
              value={overrideUnassigned} 
              onChange={(e) => setOverrideUnassigned(e.target.value)} 
              placeholder="0" 
              className="w-full border border-gray-700 rounded-lg px-4 py-2.5 bg-gray-900/50 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all"
            />
          </div>
          <div className="space-y-2 flex items-end">
            <button 
              className="w-full btn-primary flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold shadow-lg shadow-red-500/20 transition-all transform hover:scale-105"
              onClick={() => mutate()}
            >
              {NI ? <NI.Refresh className="w-4 h-4" /> : "↻"} Обновить
            </button>
          </div>
        </div>
      </div>

      {/* Настройки для директора */}
      {isDirector && data && data.length > 0 && (
        <>
          <div className="card p-6 bg-gradient-to-br from-gray-900/50 to-gray-800/50 border border-gray-700/50">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              {NI && <NI.Users className="w-5 h-5 text-red-500" />}
              Распределение недостач
            </h2>
            <div className="text-sm text-gray-300 mb-4">Делить сумму общих недостач между:</div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {data.map((r) => (
                <label 
                  key={r.employee.id} 
                  className="flex items-center gap-2 p-3 rounded-lg border border-gray-700 hover:border-red-500/50 hover:bg-gray-800/50 transition-all cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={shareIds.includes(r.employee.id)}
                    onChange={(e) => {
                      setShareIds((prev) => {
                        const set = new Set(prev);
                        if (e.target.checked) set.add(r.employee.id); else set.delete(r.employee.id);
                        return Array.from(set);
                      });
                    }}
                    className="w-4 h-4 rounded border-gray-700 bg-gray-900 text-red-500 focus:ring-red-500 focus:ring-2"
                  />
                  <span className="text-white text-sm">{r.employee.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="card p-6 bg-gradient-to-br from-gray-900/50 to-gray-800/50 border border-gray-700/50">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              {NI && <NI.FileText className="w-5 h-5 text-red-500" />}
              Управление пакетами
            </h2>
            <div className="flex flex-wrap gap-4 items-end">
              <button 
                className="btn-ghost flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-700 text-gray-300 hover:border-red-500/50 hover:bg-red-500/10 transition-all"
                onClick={createBatch}
              >
                {NI ? <NI.Plus className="w-4 h-4" /> : "+"} Создать пакет (черновик)
              </button>
              <div className="flex items-end gap-2 flex-1 min-w-[200px]">
                <div className="flex-1 space-y-2">
                  <label className="block text-xs text-gray-400">ID пакета</label>
                  <input 
                    value={batchId} 
                    onChange={(e) => setBatchId(e.target.value)} 
                    placeholder="ID пакета" 
                    className="w-full border border-gray-700 rounded-lg px-4 py-2.5 bg-gray-900/50 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all"
                  />
                </div>
                <button 
                  className="btn-primary flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold shadow-lg shadow-red-500/20 transition-all"
                  onClick={finalizeBatch}
                >
                  {NI ? <NI.Check className="w-4 h-4" /> : "✓"} Утвердить
                </button>
              </div>
            </div>
          </div>

          <div className="card p-6 bg-gradient-to-br from-gray-900/50 to-gray-800/50 border border-gray-700/50">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              {NI && <NI.Download className="w-5 h-5 text-red-500" />}
              Экспорт данных
            </h2>
            <div className="flex flex-wrap gap-3">
              <button 
                className="btn-ghost flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-700 text-gray-300 hover:border-red-500/50 hover:bg-red-500/10 transition-all"
                onClick={async () => {
                  if (!(window as any).showDirectoryPicker) { 
                    alert("Для сохранения в папку используйте Chrome/Edge (File System Access API)"); 
                    return; 
                  }
                  const dir = await (window as any).showDirectoryPicker();
                  const startD = new Date(start); 
                  const endD = new Date(end);
                  const monthName = startD.toLocaleString('ru-RU', { month: 'long' });
                  const folderName = `Общий минус ${monthName.charAt(0).toUpperCase()+monthName.slice(1)} ${startD.toLocaleDateString('ru-RU')}-${endD.toLocaleDateString('ru-RU')}`;
                  const archiveDir = await dir.getDirectoryHandle(folderName, { create: true });
                  const details = (data[0]?.unassignedDetails ?? []) as any[];
                  const headers = ["Товар","Кол-во","Цена","Сумма"];
                  const rows = details.map(d => [d.name, String(d.qty), String(d.price), String((Number(d.qty)*Number(d.price)).toFixed(2))]);
                  const csv = [headers.join(';'), ...rows.map(r=> r.map(x=> String(x).replaceAll(';',',')).join(';'))].join('\n');
                  const file = await archiveDir.getFileHandle('Общий минус.csv', { create: true });
                  const w = await (file as any).createWritable(); 
                  await w.write(new Blob(["\uFEFF"+csv], { type: 'text/csv;charset=utf-8;' })); 
                  await w.close();
                  alert('Сохранено: Общий минус');
                }}
              >
                {NI ? <NI.Download className="w-4 h-4" /> : "⬇️"} Сохранить архив Общий минус
              </button>
              <button 
                className="btn-ghost flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-700 text-gray-300 hover:border-red-500/50 hover:bg-red-500/10 transition-all"
                onClick={async () => {
                  if (!(window as any).showDirectoryPicker) { 
                    alert("Для сохранения в папку используйте Chrome/Edge (File System Access API)"); 
                    return; 
                  }
                  const dir = await (window as any).showDirectoryPicker();
                  const startD = new Date(start); 
                  const endD = new Date(end);
                  const monthName = startD.toLocaleString('ru-RU', { month: 'long' });
                  const folderName = `Долги ${monthName.charAt(0).toUpperCase()+monthName.slice(1)} ${startD.toLocaleDateString('ru-RU')}-${endD.toLocaleDateString('ru-RU')}`;
                  const archiveDir = await dir.getDirectoryHandle(folderName, { create: true });
                  for (const r of (data ?? [])) {
                    const headers = ["Товар","Кол-во","Цена","Сумма"];
                    const rows = (r.debts ?? []).map(d => [d.name, String(d.qty), String(d.price), String(Number(d.amount).toFixed(2))]);
                    const csv = [headers.join(';'), ...rows.map(rr=> rr.map(x=> String(x).replaceAll(';',',')).join(';'))].join('\n');
                    const safeName = r.employee.name.replaceAll(/[\\/:*?"<>|]/g, '_');
                    const file = await archiveDir.getFileHandle(`${safeName}.csv`, { create: true });
                    const w = await (file as any).createWritable(); 
                    await w.write(new Blob(["\uFEFF"+csv], { type: 'text/csv;charset=utf-8;' })); 
                    await w.close();
                  }
                  alert('Сохранены долги по сотрудникам');
                }}
              >
                {NI ? <NI.Download className="w-4 h-4" /> : "⬇️"} Сохранить архив Долги
              </button>
            </div>
          </div>
        </>
      )}

      {/* Таблица зарплат */}
      <div className="card overflow-hidden border border-gray-700/50">
        <div className="p-4 bg-gradient-to-r from-gray-900/50 to-gray-800/50 border-b border-gray-700/50">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            {NI && <NI.List className="w-5 h-5 text-red-500" />}
            Расчет зарплат
          </h2>
        </div>
        <div className="overflow-x-auto">
          {isLoading && (
            <div className="p-8 text-center text-gray-400">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
              <p className="mt-2">Загрузка данных...</p>
            </div>
          )}
          {!isLoading && error && (
            <div className="p-8 text-center text-red-500">
              <p>Ошибка загрузки данных: {error.message || "Неизвестная ошибка"}</p>
            </div>
          )}
          {!isLoading && !error && (!data || data.length === 0) && (
            <div className="p-8 text-center text-gray-400">
              <p>Нет данных для отображения. Проверьте период и наличие сотрудников в системе.</p>
            </div>
          )}
          {!isLoading && !error && data && data.length > 0 && (
            <table className="min-w-full text-sm">
              <thead className="hidden lg:table-header-group bg-gray-900/30">
                <tr className="text-left border-b border-gray-700/50">
                  <th className="p-3 text-white font-semibold">Сотрудник</th>
                  <th className="p-3 text-white font-semibold">Часы</th>
                  <th className="p-3 text-white font-semibold">Смены</th>
                  <th className="p-3 text-white font-semibold">Начислено</th>
                  <th className="p-3 text-white font-semibold">Долги</th>
                  <th className="p-3 text-white font-semibold">Недостачи</th>
                  <th className="p-3 text-white font-semibold">Штрафы</th>
                  <th className="p-3 text-white font-semibold">Бонусы</th>
                  <th className="p-3 text-white font-semibold">Кальяны</th>
                  <th className="p-3 text-white font-semibold">Итого</th>
                  <th className="p-3 text-white font-semibold">Расчётный лист</th>
                  {isDirector && <th className="p-3 text-white font-semibold">Выплатить</th>}
                </tr>
              </thead>
              <tbody>
                {data.map((r) => (
                  <>
                    {/* Desktop view */}
                    <tr key={r.employee.id} className="border-b border-gray-700/30 hidden lg:table-row hover:bg-gray-800/30 transition-colors">
                      <td className="p-3 font-medium text-white">{r.employee.name}</td>
                      <td className="p-3 text-gray-300">{Number(r.totalHours).toFixed(2)}</td>
                      <td className="p-3 text-gray-300">{r.totalShifts}</td>
                      <td className="p-3 text-gray-300">{Number(r.gross).toFixed(2)} ₽</td>
                      <td className="p-3 text-red-400">-{Number(r.debtAmount).toFixed(2)} ₽</td>
                      <td className="p-3 text-red-400">-{Number(r.shortageAmt).toFixed(2)} ₽</td>
                      <td className="p-3 text-red-400">-{Number(r.penalties || 0).toFixed(2)} ₽</td>
                      <td className="p-3 text-green-400">+{Number(r.bonuses || 0).toFixed(2)} ₽</td>
                      <td className="p-3 text-green-400">+{Number(r.hookah || 0).toFixed(2)} ₽</td>
                      <td className="p-3 font-bold text-white text-lg">{Number(r.net).toFixed(2)} ₽</td>
                      <td className="p-3">
                        <button 
                          className="btn-ghost flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-700 text-gray-300 hover:border-red-500/50 hover:bg-red-500/10 transition-all text-sm"
                          onClick={() => download(r)}
                        >
                          {NI ? <NI.Download className="w-4 h-4" /> : "⬇️"} Скачать
                        </button>
                      </td>
                      {isDirector && (
                        <td className="p-3">
                          <PaymentButton employeeId={r.employee.id} employeeName={r.employee.name} amount={Number(r.net)} periodStart={start} periodEnd={end} />
                        </td>
                      )}
                    </tr>
                    {/* Mobile view */}
                    <tr key={`${r.employee.id}-mobile`} className="border-b border-gray-700/30 lg:hidden">
                      <td className="p-4" colSpan={isDirector ? 12 : 11}>
                        <div className="space-y-4">
                          <div className="font-semibold text-white text-lg">{r.employee.name}</div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <div className="text-xs text-gray-400">Часы</div>
                              <div className="text-white font-medium">{Number(r.totalHours).toFixed(2)}</div>
                            </div>
                            <div className="space-y-1">
                              <div className="text-xs text-gray-400">Смены</div>
                              <div className="text-white font-medium">{r.totalShifts}</div>
                            </div>
                            <div className="space-y-1">
                              <div className="text-xs text-gray-400">Начислено</div>
                              <div className="text-white font-medium">{Number(r.gross).toFixed(2)} ₽</div>
                            </div>
                            <div className="space-y-1">
                              <div className="text-xs text-gray-400">Долги</div>
                              <div className="text-red-400 font-medium">-{Number(r.debtAmount).toFixed(2)} ₽</div>
                            </div>
                            <div className="space-y-1">
                              <div className="text-xs text-gray-400">Недостачи</div>
                              <div className="text-red-400 font-medium">-{Number(r.shortageAmt).toFixed(2)} ₽</div>
                            </div>
                            <div className="space-y-1">
                              <div className="text-xs text-gray-400">Штрафы</div>
                              <div className="text-red-400 font-medium">-{Number(r.penalties || 0).toFixed(2)} ₽</div>
                            </div>
                            <div className="space-y-1">
                              <div className="text-xs text-gray-400">Бонусы</div>
                              <div className="text-green-400 font-medium">+{Number(r.bonuses || 0).toFixed(2)} ₽</div>
                            </div>
                            <div className="space-y-1">
                              <div className="text-xs text-gray-400">Кальяны</div>
                              <div className="text-green-400 font-medium">+{Number(r.hookah || 0).toFixed(2)} ₽</div>
                            </div>
                            <div className="space-y-1 col-span-2 pt-2 border-t border-gray-700/50">
                              <div className="text-xs text-gray-400">Итого к выплате</div>
                              <div className="text-white font-bold text-xl">{Number(r.net).toFixed(2)} ₽</div>
                            </div>
                          </div>
                          <div className={`flex gap-2 pt-2 border-t border-gray-700/50 ${isDirector ? 'flex-col' : ''}`}>
                            <button 
                              className="btn-ghost flex items-center justify-center gap-2 flex-1 px-4 py-2.5 rounded-lg border border-gray-700 text-gray-300 hover:border-red-500/50 hover:bg-red-500/10 transition-all"
                              onClick={() => download(r)}
                            >
                              {NI ? <NI.Download className="w-4 h-4" /> : "⬇️"} Скачать PDF
                            </button>
                            {isDirector && (
                              <div className="flex-1">
                                <PaymentButton employeeId={r.employee.id} employeeName={r.employee.name} amount={Number(r.net)} periodStart={start} periodEnd={end} />
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  </>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function PaymentButton({ employeeId, employeeName, amount, periodStart, periodEnd }: { employeeId: string; employeeName: string; amount: number; periodStart: string; periodEnd: string }) {
  const { data: session } = useSession();
  const role = ((session as any)?.user as any)?.role as string | undefined;
  const isDirector = role === "DIRECTOR" || role === "OWNER";
  
  const [showModal, setShowModal] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [status, setStatus] = useState<"PENDING" | "PAID" | "CANCELLED">("PENDING");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const NI = useNextIcons();
  const { showSuccess } = useSuccess();
  
  const { data: employee } = useSWR(`/api/employees/${employeeId}`, fetcher);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Показываем кнопку только для директора
  if (!isDirector) {
    return null;
  }
  
  const handleSave = async () => {
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("employeeId", employeeId);
      formData.append("amount", String(amount));
      formData.append("periodStart", periodStart);
      formData.append("periodEnd", periodEnd);
      formData.append("status", status);
      formData.append("notes", notes);
      if (pdfFile) formData.append("pdf", pdfFile);
      
      const res = await fetch("/api/salary-payments", {
        method: "POST",
        body: formData,
      });
      
      if (!res.ok) throw new Error("Ошибка при сохранении");
      
      showSuccess("Выплата сохранена!");
      setShowModal(false);
      setPdfFile(null);
      setNotes("");
    } catch (error) {
      alert("Ошибка при сохранении выплаты");
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <>
      <button 
        className="btn-primary text-sm w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold shadow-lg shadow-red-500/20 transition-all"
        onClick={() => setShowModal(true)}
      >
        {NI ? <NI.CreditCard className="w-4 h-4" /> : "💳"} Выплатить
      </button>
      
      {showModal && mounted && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ background: "rgba(0, 0, 0, 0.8)" }} onClick={() => setShowModal(false)}>
          <div className="modal-panel max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 rounded-lg shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                {NI && <NI.CreditCard className="w-5 h-5 text-red-500" />}
                Выплата зарплаты
              </h2>
              <button className="text-white text-2xl hover:text-red-500 transition-colors" onClick={() => setShowModal(false)}>×</button>
            </div>
            
            <div className="space-y-4">
              <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                <div className="text-sm text-gray-400 mb-1">Сотрудник</div>
                <div className="text-white font-semibold text-lg">{employeeName}</div>
              </div>
              
              {employee && (
                <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                  <div className="text-xs text-gray-400 mb-3 font-medium">Платежные данные</div>
                  {employee.paymentMethod === "SBP" && employee.phoneNumber && (
                    <div className="text-white text-sm mb-2 flex items-center gap-2">
                      {NI && <NI.CreditCard className="w-4 h-4" />}
                      СБП: {employee.phoneNumber}
                    </div>
                  )}
                  {employee.paymentMethod === "BANK_CARD" && employee.cardNumber && (
                    <div className="text-white text-sm mb-2 flex items-center gap-2">
                      {NI && <NI.CreditCard className="w-4 h-4" />}
                      Карта: {employee.cardNumber}
                    </div>
                  )}
                  {employee.bankName && (
                    <div className="text-white text-sm mb-2 flex items-center gap-2">
                      {NI && <NI.CreditCard className="w-4 h-4" />}
                      Банк: {employee.bankName}
                    </div>
                  )}
                  {!employee.paymentMethod && (
                    <div className="text-yellow-500 text-sm flex items-center gap-2">
                      {NI && <NI.AlertTriangle className="w-4 h-4" />}
                      ⚠️ Платежные данные не указаны
                    </div>
                  )}
                </div>
              )}
              
              <div className="p-4 bg-gradient-to-r from-red-500/20 to-red-600/20 border border-red-500/30 rounded-lg">
                <div className="text-sm text-gray-300 mb-1">Сумма к выплате</div>
                <div className="text-white text-3xl font-bold">{amount.toFixed(2)} ₽</div>
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-white">Статус выплаты</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full border border-gray-700 rounded-lg px-4 py-2.5 bg-gray-900/50 text-white focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all"
                >
                  <option value="PENDING">В процессе</option>
                  <option value="PAID">Выплачено</option>
                  <option value="CANCELLED">Отменено</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-white">PDF документ</label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                  className="w-full border border-gray-700 rounded-lg px-4 py-2.5 bg-gray-900/50 text-white focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all"
                />
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-white">Заметки</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-700 rounded-lg px-4 py-2.5 bg-gray-900/50 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all resize-none"
                  placeholder="Дополнительная информация..."
                />
              </div>
              
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full btn-primary flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold shadow-lg shadow-red-500/20 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {NI ? <NI.Save className="w-4 h-4" /> : "💾"} {saving ? "Сохранение..." : "Сохранить выплату"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      ) : null}
    </>
  );
}
