"use client";
import useSWR from "swr";
import { useEffect, useMemo, useState } from "react";
import { useNextIcons } from "@/components/NI";
import { useSession } from "next-auth/react";

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
const fetcher = (u: string) => fetch(u).then((r) => r.json());

export default function SalariesPage() {
  const NI = useNextIcons();
  const { data: session } = useSession();
  const role = ((session as any)?.user as any)?.role as string | undefined;
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
    const styles = StyleSheet.create({
      page: { padding: 28, fontFamily: "NotoSans", position: "relative" },
      header: { fontSize: 18, marginBottom: 12, fontWeight: 700 },
      row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6, fontSize: 12 },
      label: { width: 160 },
      value: { flex: 1, textAlign: "right" },
      hr: { height: 1, backgroundColor: "#e5e7eb", marginVertical: 8 },
      stamp: { width: 120, position: "absolute", right: 24, bottom: 24, opacity: 0.85 },
      sectionTitle: { fontSize: 14, marginTop: 10, marginBottom: 6, fontWeight: 700 },
      listItem: { fontSize: 11, marginBottom: 3 },
    });
    const fmtDate = (s: string) => new Date(s).toLocaleDateString("ru-RU");
    const fmt = (n: number) => n.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const doc = (
      <Document>
        <Page size="A4" style={styles.page}>
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
          <Image src="/pechat.png" style={styles.stamp} />
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
  const { data, mutate, isLoading } = useSWR<Row[]>(`/api/salaries/calculate?start=${start}&end=${end}&share=${encodeURIComponent(shareIds.join(","))}&override=${encodeURIComponent(overrideUnassigned || "")}`, fetcher);
  useEffect(() => {
    if (!data || role !== "DIRECTOR") return;
    if (shareIds.length === 0 && data.length > 0) setShareIds(data.map((r) => r.employee.id));
  }, [data]);

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
    <div className="space-y-4">
      <div className="card p-3 flex items-end gap-2">
        <div>
          <label className="block text-xs text-gray-500">Начало</label>
          <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="border rounded px-2 py-1" />
        </div>
        <div>
          <label className="block text-xs text-gray-500">Конец</label>
          <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="border rounded px-2 py-1" />
        </div>
        <div>
          <label className="block text-xs text-gray-500">Общая недостача (из страницы Недостачи)</label>
          <input value={overrideUnassigned} onChange={(e)=> setOverrideUnassigned(e.target.value)} className="border rounded px-2 py-1" placeholder="0" />
        </div>
        <button className="btn-primary" onClick={() => mutate()}>{NI ? <NI.Refresh className="w-4 h-4 inline mr-1" /> : "↻"} Обновить</button>
        {role === "DIRECTOR" && (
          <>
            <button className="btn-ghost" onClick={createBatch}>Создать пакет (черновик)</button>
            <div className="flex items-end gap-2 ml-auto">
              <div>
                <label className="block text-xs text-gray-500">ID пакета</label>
                <input value={batchId} onChange={(e) => setBatchId(e.target.value)} className="border rounded px-2 py-1" placeholder="ID пакета" />
              </div>
              <button className="btn-primary" onClick={finalizeBatch}>Утвердить пакет</button>
            </div>
          </>
        )}
      </div>
      {role === "DIRECTOR" && data && data.length > 0 ? (
        <div className="card p-3">
          <div className="text-sm mb-2">Делить сумму общих недостач между:</div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {data.map((r) => (
              <label key={r.employee.id} className="inline-flex items-center gap-2">
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
                />
                <span>{r.employee.name}</span>
              </label>
            ))}
          </div>
        </div>
      ) : null}
      {role === "DIRECTOR" && data && data.length > 0 ? (
        <div className="card p-3 flex flex-wrap items-end gap-2">
          <button className="btn-ghost" onClick={async ()=>{
            if (!(window as any).showDirectoryPicker) { alert("Для сохранения в папку используйте Chrome/Edge (File System Access API)"); return; }
            const dir = await (window as any).showDirectoryPicker();
            const startD = new Date(start); const endD = new Date(end);
            const monthName = startD.toLocaleString('ru-RU', { month: 'long' });
            const folderName = `Общий минус ${monthName.charAt(0).toUpperCase()+monthName.slice(1)} ${startD.toLocaleDateString('ru-RU')}-${endD.toLocaleDateString('ru-RU')}`;
            const archiveDir = await dir.getDirectoryHandle(folderName, { create: true });
            const details = (data[0]?.unassignedDetails ?? []) as any[];
            const headers = ["Товар","Кол-во","Цена","Сумма"];
            const rows = details.map(d => [d.name, String(d.qty), String(d.price), String((Number(d.qty)*Number(d.price)).toFixed(2))]);
            const csv = [headers.join(';'), ...rows.map(r=> r.map(x=> String(x).replaceAll(';',',')).join(';'))].join('\n');
            const file = await archiveDir.getFileHandle('Общий минус.csv', { create: true });
            const w = await (file as any).createWritable(); await w.write(new Blob(["\uFEFF"+csv], { type: 'text/csv;charset=utf-8;' })); await w.close();
            alert('Сохранено: Общий минус');
          }}>Сохранить архив Общий минус…</button>
          <button className="btn-ghost" onClick={async ()=>{
            if (!(window as any).showDirectoryPicker) { alert("Для сохранения в папку используйте Chrome/Edge (File System Access API)"); return; }
            const dir = await (window as any).showDirectoryPicker();
            const startD = new Date(start); const endD = new Date(end);
            const monthName = startD.toLocaleString('ru-RU', { month: 'long' });
            const folderName = `Долги ${monthName.charAt(0).toUpperCase()+monthName.slice(1)} ${startD.toLocaleDateString('ru-RU')}-${endD.toLocaleDateString('ru-RU')}`;
            const archiveDir = await dir.getDirectoryHandle(folderName, { create: true });
            for (const r of (data ?? [])) {
              const headers = ["Товар","Кол-во","Цена","Сумма"];
              const rows = (r.debts ?? []).map(d => [d.name, String(d.qty), String(d.price), String(Number(d.amount).toFixed(2))]);
              const csv = [headers.join(';'), ...rows.map(rr=> rr.map(x=> String(x).replaceAll(';',',')).join(';'))].join('\n');
              const safeName = r.employee.name.replaceAll(/[\\/:*?"<>|]/g, '_');
              const file = await archiveDir.getFileHandle(`${safeName}.csv`, { create: true });
              const w = await (file as any).createWritable(); await w.write(new Blob(["\uFEFF"+csv], { type: 'text/csv;charset=utf-8;' })); await w.close();
            }
            alert('Сохранены долги по сотрудникам');
          }}>Сохранить архив Долги…</button>
        </div>
      ) : null}
      <div className="card overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead><tr className="bg-gray-50 text-left"><th className="p-2">Сотрудник</th><th className="p-2">Часы</th><th className="p-2">Смены</th><th className="p-2">Начислено</th><th className="p-2">Долги</th><th className="p-2">Недостачи</th><th className="p-2">Штрафы</th><th className="p-2">Бонусы</th><th className="p-2">Кальяны</th><th className="p-2">Итого</th><th className="p-2">Расчётный лист</th></tr></thead>
          <tbody>
            {isLoading && <tr><td className="p-3" colSpan={8}>Загрузка...</td></tr>}
            {!isLoading && (data ?? []).map((r) => (
              <tr key={r.employee.id} className="border-t">
                <td className="p-2">{r.employee.name}</td>
                <td className="p-2">{Number(r.totalHours).toFixed(2)}</td>
                <td className="p-2">{r.totalShifts}</td>
                <td className="p-2">{Number(r.gross).toFixed(2)}</td>
                <td className="p-2">{Number(r.debtAmount).toFixed(2)}</td>
                <td className="p-2">{Number(r.shortageAmt).toFixed(2)}</td>
                <td className="p-2">{Number(r.penalties || 0).toFixed(2)}</td>
                <td className="p-2">{Number(r.bonuses || 0).toFixed(2)}</td>
                <td className="p-2">{Number(r.hookah || 0).toFixed(2)}</td>
                <td className="p-2 font-medium">{Number(r.net).toFixed(2)}</td>
                <td className="p-2"><button className="btn-ghost flex items-center gap-1" onClick={() => download(r)}>{NI ? <NI.Download className="w-4 h-4" /> : "⬇️"} Скачать</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="text-right text-sm">Итого к выплате: <span className="font-medium">{totalNet.toFixed(2)} ₽</span></div>
    </div>
  );
}

function Payslip(r: Row & { start: string; end: string }) {
  const styles = StyleSheet.create({
    page: { padding: 28, fontFamily: "Helvetica", position: "relative" },
    header: { fontSize: 18, marginBottom: 12, fontWeight: 700 },
    row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6, fontSize: 12 },
    label: { width: 160 },
    value: { flex: 1, textAlign: "right" },
    hr: { height: 1, backgroundColor: "#e5e7eb", marginVertical: 8 },
    stamp: { width: 120, position: "absolute", right: 24, bottom: 24, opacity: 0.85 },
  });
  const fmtDate = (s: string) => new Date(s).toLocaleDateString("ru-RU");
  const fmt = (n: number) => n.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.header}>Расчётный лист</Text>
        <View style={styles.row}><Text style={styles.label}>Сотрудник</Text><Text style={styles.value}>{r.employee.name}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Период</Text><Text style={styles.value}>{fmtDate(r.start)} — {fmtDate(r.end)}</Text></View>
        <View style={styles.hr} />
        <View style={styles.row}><Text style={styles.label}>Часы</Text><Text style={styles.value}>{fmt(r.totalHours)}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Смены</Text><Text style={styles.value}>{r.totalShifts}</Text></View>
        <View style={styles.hr} />
        <View style={styles.row}><Text style={styles.label}>Начислено</Text><Text style={styles.value}>{fmt(Number(r.gross))} ₽</Text></View>
        <View style={styles.row}><Text style={styles.label}>Долги</Text><Text style={styles.value}>−{fmt(Number(r.debtAmount))} ₽</Text></View>
        <View style={styles.row}><Text style={styles.label}>Недостачи</Text><Text style={styles.value}>−{fmt(Number(r.shortageAmt))} ₽</Text></View>
        {Array.isArray((r as any).penaltiesList) && (r as any).penaltiesList.length > 0 ? (
          <>
            <Text style={{ fontSize: 12, marginTop: 6, fontWeight: 700 }}>Штрафы — детали</Text>
            {(r as any).penaltiesList.map((p: any, i: number) => (
              <Text key={i} style={{ fontSize: 11, marginBottom: 2 }}>−{fmt(Number(p.amount))} ₽ — {p.reason}</Text>
            ))}
          </>
        ) : null}
        {Array.isArray((r as any).bonusesList) && (r as any).bonusesList.length > 0 ? (
          <>
            <Text style={{ fontSize: 12, marginTop: 6, fontWeight: 700 }}>Бонусы — детали</Text>
            {(r as any).bonusesList.map((b: any, i: number) => (
              <Text key={i} style={{ fontSize: 11, marginBottom: 2 }}>+{fmt(Number(b.amount))} ₽ — {b.reason}</Text>
            ))}
          </>
        ) : null}
        <View style={styles.hr} />
        <View style={styles.row}><Text style={styles.label}>Итого к выплате</Text><Text style={styles.value}>{fmt(Number(r.net))} ₽</Text></View>
        <Image src="/pechat.png" style={styles.stamp} />
      </Page>
    </Document>
  );
}


