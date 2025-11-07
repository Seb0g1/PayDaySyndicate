"use client";
import { Calendar, dateFnsLocalizer, Views } from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { format, startOfWeek, getDay } from "date-fns";
import useSWR from "swr";
import { Fragment, useMemo, useState, useEffect, useCallback } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { useSession } from "next-auth/react";
import { useNextIcons } from "@/components/NI";
import { useRouter } from "next/navigation";

const locales = { ru: require("date-fns/locale/ru") };
const localizer = dateFnsLocalizer({ format, startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }), getDay, locales });

type Shift = {
  id: string;
  employeeId: string;
  date: string;
  startTime: string;
  endTime: string;
  type: "MORNING" | "EVENING" | "NIGHT" | "CUSTOM";
  employee?: { id: string; name: string };
  reports?: Report[];
};

type Employee = { id: string; name: string };

type Report = {
  id: string;
  type: "FINANCIAL" | "HOOKAH" | "CORK_FEE" | "TABLE_STATUS" | "PROMOTION" | "PLAYSTATION" | "VAT_INVOICE";
  employeeId: string;
  shiftId?: string | null;
  data: any;
  files: string[];
  notes?: string | null;
  amount?: number | null;
  createdAt: string;
  employee: Employee;
  shift?: { id: string; date: string } | null;
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const reportTypeLabels: Record<Report["type"], string> = {
  FINANCIAL: "📊 Финансовые",
  HOOKAH: "💨 Кальяны",
  CORK_FEE: "🍾 Пробковый сбор",
  TABLE_STATUS: "🖥️ Состояние столов",
  PROMOTION: "🎁 Акции",
  PLAYSTATION: "🎮 PlayStation",
  VAT_INVOICE: "📄 Накладные",
};

export default function ReportsPage() {
  const { data: session } = useSession();
  const role = ((session as any)?.user as any)?.role as string | undefined;
  const { data: me } = useSWR<any>("/api/me", fetcher);
  const myEmployeeId = me?.employeeId as string | undefined;
  
  const isEmployee = role === "EMPLOYEE";
  const isDirector = role === "DIRECTOR";

  if (isEmployee) {
    return <EmployeeReportsView employeeId={myEmployeeId} />;
  }

  return <AdminReportsView />;
}

// Представление для администраторов - календарь со сменами и отчетами
function AdminReportsView() {
  const router = useRouter();
  const NI = useNextIcons();
  const { data: employees } = useSWR<Employee[]>("/api/employees", fetcher);
  const [employeeId, setEmployeeId] = useState("");
  const { data: shifts } = useSWR<Shift[]>(`/api/shifts?employeeId=${employeeId}`, fetcher);
  const { data: reports } = useSWR<Report[]>("/api/reports", fetcher);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const ruType = (t: Shift["type"]) => (t === "NIGHT" ? "Ночь" : t === "MORNING" ? "День" : "Другая");
  
  const events = useMemo(() => {
    return (shifts ?? []).map((s) => {
      const startTime = new Date(s.startTime);
      const endTime = new Date(s.endTime);
      const timeStr = `${startTime.getHours().toString().padStart(2, '0')}:${startTime.getMinutes().toString().padStart(2, '0')} - ${endTime.getHours().toString().padStart(2, '0')}:${endTime.getMinutes().toString().padStart(2, '0')}`;
      
      return {
        id: s.id,
        title: `${s.employee?.name ?? "Сотрудник"}: ${ruType(s.type)} (${timeStr})`,
        start: startTime,
        end: endTime,
        resource: s,
        allDay: false,
      };
    });
  }, [shifts]);

  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  
  const onSelectEvent = async (e: any) => {
    const shift: Shift = e.resource;
    const shiftReports = reports?.filter(r => r.shiftId === shift.id) || [];
    setSelectedShift({ ...shift, reports: shiftReports });
    setDetailOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="card p-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-end justify-between gap-2">
          <div className="flex-1">
            <label className="block text-xs text-gray-500">Сотрудник</label>
            <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className="border rounded px-2 py-1 w-full">
              <option value="">Все</option>
              {(employees ?? []).map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>
          <button className="btn-primary flex items-center justify-center gap-1 whitespace-nowrap" onClick={() => router.push("/dashboard/reports/create")}>
            <NI.Plus className="w-4 h-4" /> Добавить отчёт
          </button>
        </div>
      </div>
      <div style={{ height: '70vh' }} className="card p-2">
        <Calendar
          localizer={localizer}
          events={events}
          defaultView={Views.MONTH}
          date={currentDate}
          onNavigate={(d) => setCurrentDate(d)}
          onSelectEvent={onSelectEvent}
          messages={{
            month: "Месяц",
            week: "Неделя",
            day: "День",
            agenda: "Повестка",
            today: "Сегодня",
            previous: "Назад",
            next: "Вперёд",
          }}
          dayPropGetter={(date) => {
            const day = getDay(date);
            if (day === 0 || day === 6) {
              return { style: { outline: "2px solid #ef4444", outlineOffset: "-1px" } } as any;
            }
            return {} as any;
          }}
          eventPropGetter={(event) => {
            const s = event.resource as Shift;
            const base = { style: { backgroundColor: "#2563eb", borderRadius: 6, color: "#fff", border: 0, padding: 2 } } as any;
            if (s.type === "NIGHT") base.style.backgroundColor = "#0ea5e9";
            if (s.type === "MORNING") base.style.backgroundColor = "#22c55e";
            return base;
          }}
        />
      </div>

      {selectedShift && (
        <ShiftDetailsModal
          isOpen={detailOpen}
          onClose={() => { setDetailOpen(false); setSelectedShift(null); }}
          shift={selectedShift}
        />
      )}
    </div>
  );
}

// Представление для сотрудников - таблица для добавления отчетов
function EmployeeReportsView({ employeeId }: { employeeId?: string }) {
  const router = useRouter();
  const NI = useNextIcons();
  const { data, mutate } = useSWR<Report[]>(employeeId ? `/api/reports?employeeId=${employeeId}` : null, fetcher);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);

  const handleEdit = async (report: Report) => {
    router.push(`/dashboard/reports/edit/${report.id}`);
  };

  const handleDelete = async (report: Report) => {
    try {
      const res = await fetch(`/api/reports/${report.id}`, { method: "DELETE" });
      if (res.ok) {
        mutate();
        alert("Отчет удален");
      } else {
        alert("Ошибка при удалении отчета");
      }
    } catch (error) {
      alert("Ошибка при удалении отчета");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Отчёты</h1>
        <button
          className="btn-primary flex items-center gap-1"
          onClick={() => router.push("/dashboard/reports/create")}
        >
          <NI.Plus className="w-4 h-4" /> Добавить отчёт
        </button>
      </div>

      <div className="card overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left">
              <th className="p-2">Дата</th>
              <th className="p-2">Тип</th>
              <th className="p-2">Данные</th>
              <th className="p-2">Файлы</th>
              <th className="p-2">Сумма</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((r) => (
              <tr key={r.id} className="border-t hover:bg-gray-50">
                <td className="p-2">{new Date(r.createdAt).toLocaleDateString("ru-RU")}</td>
                <td className="p-2">{reportTypeLabels[r.type]}</td>
                <td className="p-2 text-xs">
                  {r.notes && <div className="text-gray-600">{r.notes}</div>}
                </td>
                <td className="p-2">
                  {r.files.length > 0 ? (
                    <span className="text-blue-600">📎 {r.files.length} файл(ов)</span>
                  ) : (
                    "-"
                  )}
                </td>
                <td className="p-2">
                  {r.amount ? Number(r.amount).toFixed(2) : "-"}
                </td>
                <td className="p-2">
                  <button
                    className="text-blue-600 hover:underline"
                    onClick={() => {
                      setSelectedReport(r);
                      setViewModalOpen(true);
                    }}
                  >
                    Просмотр
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedReport && (
        <ReportViewModal
          isOpen={viewModalOpen}
          onClose={() => {
            setViewModalOpen(false);
            setSelectedReport(null);
          }}
          report={selectedReport}
          onEdit={() => handleEdit(selectedReport)}
        />
      )}
    </div>
  );
}

// Модальное окно деталей смены с отчетами (для админов)
function ShiftDetailsModal({ isOpen, onClose, shift }: { isOpen: boolean; onClose: () => void; shift: Shift }) {
  const router = useRouter();
  const reports = shift.reports || [];
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);

  const handleEdit = async (report: Report) => {
    router.push(`/dashboard/reports/edit/${report.id}`);
  };

  const handleDelete = async (report: Report) => {
    try {
      const res = await fetch(`/api/reports/${report.id}`, { method: "DELETE" });
      if (res.ok) {
        // Обновляем данные смены
        const shiftResponse = await fetch(`/api/shifts/${shift.id}`);
        if (shiftResponse.ok) {
          const updatedShift = await shiftResponse.json();
          // Лучше перезагрузить страницу или обновить данные через SWR
          window.location.reload();
        }
        alert("Отчет удален");
      } else {
        alert("Ошибка при удалении отчета");
      }
    } catch (error) {
      alert("Ошибка при удалении отчета");
    }
  };

  return (
    <>
      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={onClose}>
          <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0">
            <div className="fixed inset-0 bg-black/50" />
          </Transition.Child>
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                <Dialog.Panel className="modal-panel w-full max-w-3xl p-6">
                  <Dialog.Title className="text-lg font-medium mb-4 text-white">
                    Смена: {shift.employee?.name} - {new Date(shift.date).toLocaleDateString("ru-RU")}
                  </Dialog.Title>
                  
                  <div className="space-y-2 mb-4">
                    <div className="text-white"><strong style={{ color: "rgba(255, 255, 255, 0.7)" }}>Время:</strong> {new Date(shift.startTime).toLocaleTimeString("ru-RU")} - {new Date(shift.endTime).toLocaleTimeString("ru-RU")}</div>
                  </div>

                  <h3 className="font-medium mb-2 text-white">Отчёты смены:</h3>
                  {reports.length === 0 ? (
                    <p className="text-gray-400">Нет отчётов</p>
                  ) : (
                    <div className="space-y-2">
                      {reports.map((r) => (
                        <div key={r.id} className="border border-red-500/30 rounded p-3 bg-gray-900">
                          <div className="flex items-center justify-between">
                            <div className="font-medium text-white">{reportTypeLabels[r.type]}</div>
                            <button
                              className="text-red-500 text-sm hover:text-red-400 hover:underline"
                              onClick={() => {
                                setSelectedReport(r);
                                setViewModalOpen(true);
                              }}
                            >
                              Просмотр
                            </button>
                          </div>
                          {r.notes && <div className="text-sm text-gray-300">{r.notes}</div>}
                          {r.amount && <div className="text-sm text-white">Сумма: {Number(r.amount).toFixed(2)} руб</div>}
                          {r.files.length > 0 && (
                            <div className="text-sm text-red-500">📎 {r.files.length} файл(ов)</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <button className="mt-4 btn-primary" onClick={onClose}>Закрыть</button>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {selectedReport && (
        <ReportViewModal
          isOpen={viewModalOpen}
          onClose={() => {
            setViewModalOpen(false);
            setSelectedReport(null);
          }}
          report={selectedReport}
          onEdit={() => handleEdit(selectedReport)}
          onDelete={() => handleDelete(selectedReport)}
        />
      )}
    </>
  );
}

// Модальное окно для добавления отчета
function ReportModal({ isOpen, onClose, employeeId, shifts, onSaved }: { isOpen: boolean; onClose: () => void; employeeId?: string; shifts: Shift[]; onSaved: () => void }) {
  const NI = useNextIcons();
  const [type, setType] = useState<Report["type"]>("FINANCIAL");
  const [shiftId, setShiftId] = useState("");
  const [notes, setNotes] = useState("");
  const [amount, setAmount] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  // Фильтруем смены: вчера, сегодня, завтра
  const filteredShifts = useMemo(() => {
    if (!employeeId || !shifts) return [];
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return shifts.filter(s => {
      const shiftDate = new Date(s.date);
      const shiftDateOnly = new Date(shiftDate.getFullYear(), shiftDate.getMonth(), shiftDate.getDate());
      const shiftTime = shiftDateOnly.getTime();
      return (!employeeId || s.employeeId === employeeId) && 
             (shiftTime === yesterday.getTime() ||
              shiftTime === today.getTime() ||
              shiftTime === tomorrow.getTime());
    }).sort((a, b) => {
      // Сортируем по дате (новые сначала)
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [employeeId, shifts]);

  // Специфичные поля для каждого типа
  const [financialShiftPhase, setFinancialShiftPhase] = useState<"START" | "END">("START");
  const [financialAdmin, setFinancialAdmin] = useState("");
  const [financialNalLangame, setFinancialNalLangame] = useState("");
  const [financialNalFact, setFinancialNalFact] = useState("");
  const [financialBeznalLangame, setFinancialBeznalLangame] = useState("");
  const [financialBeznalFact, setFinancialBeznalFact] = useState("");
  const [financialDiscrepancy, setFinancialDiscrepancy] = useState("");

  const [corkCategory, setCorkCategory] = useState("NORMAL");
  const [corkQuantity, setCorkQuantity] = useState("");
  const [corkPc, setCorkPc] = useState("");
  const [corkPcModal, setCorkPcModal] = useState(false);

  const [tableAdmin, setTableAdmin] = useState("");
  const [tableShiftPhase, setTableShiftPhase] = useState<"START" | "MIDDLE">("START");

  const [playstationTime, setPlaystationTime] = useState("");
  const [playstationPc, setPlaystationPc] = useState("");
  const [playstationPcModal, setPlaystationPcModal] = useState(false);

  const [promotionDate, setPromotionDate] = useState("");
  const [promotionPhone, setPromotionPhone] = useState("");
  const [promotionClientName, setPromotionClientName] = useState("");
  const [promotionType, setPromotionType] = useState<"REVIEW" | "EAT_PLAY">("REVIEW");

  const [vatDate, setVatDate] = useState("");
  const [vatMonth, setVatMonth] = useState("");
  const [vatDescription, setVatDescription] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setSelectedFiles(Array.from(e.target.files));
  };

  const pcOptions = [...Array(40).keys()].map(i => `PC${i + 1}`).concat(["PS5"]);

  const save = async () => {
    const files: string[] = selectedFiles.map(f => f.name);
    let data: any = {};

    if (type === "FINANCIAL") {
      data = {
        shiftPhase: financialShiftPhase,
        admin: financialAdmin,
        nalLangame: Number(financialNalLangame) || 0,
        nalFact: Number(financialNalFact) || 0,
        beznalLangame: financialBeznalLangame ? Number(financialBeznalLangame) : undefined,
        beznalFact: financialBeznalFact ? Number(financialBeznalFact) : undefined,
        discrepancy: financialDiscrepancy,
      };
    } else if (type === "CORK_FEE") {
      data = { category: corkCategory, quantity: Number(corkQuantity) || 0, pc: corkPc };
    } else if (type === "TABLE_STATUS") {
      data = { admin: tableAdmin, shiftPhase: tableShiftPhase };
    } else if (type === "PLAYSTATION") {
      data = { time: playstationTime, pc: playstationPc };
    } else if (type === "PROMOTION") {
      data = { date: promotionDate, phone: promotionPhone, clientName: promotionClientName, promoType: promotionType };
    } else if (type === "VAT_INVOICE") {
      data = { date: vatDate, month: vatMonth, description: vatDescription };
    }

    await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        employeeId: employeeId || "",
        shiftId: shiftId || undefined,
        notes,
        amount: amount ? Number(amount) : undefined,
        files,
        data,
      }),
    });

    onSaved();
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="fixed inset-0 bg-black/30" />
        </Transition.Child>
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
              <Dialog.Panel className="w-full max-w-2xl rounded bg-white p-6 shadow max-h-[90vh] overflow-y-auto">
                <Dialog.Title className="text-lg font-medium mb-4">Новый отчёт</Dialog.Title>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">Тип отчёта</label>
                    <select value={type} onChange={(e) => setType(e.target.value as Report["type"])} className="border rounded px-2 py-1 w-full">
                      {Object.entries(reportTypeLabels).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Смена</label>
                    <select 
                      value={shiftId} 
                      onChange={(e) => setShiftId(e.target.value)} 
                      className="border rounded px-2 py-1 w-full bg-gray-900 text-white border-gray-700"
                      disabled={!employeeId || filteredShifts.length === 0}
                    >
                      <option value="">{!employeeId ? "Сначала выберите сотрудника" : filteredShifts.length === 0 ? "Нет доступных смен" : "Без привязки к смене"}</option>
                      {filteredShifts.map((s) => (
                        <option key={s.id} value={s.id}>
                          {new Date(s.date).toLocaleDateString("ru-RU")} - {new Date(s.startTime).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                        </option>
                      ))}
                    </select>
                    {employeeId && filteredShifts.length === 0 && (
                      <p className="text-xs text-gray-400 mt-1">Нет смен (вчера, сегодня, завтра) для выбранного сотрудника</p>
                    )}
                  </div>

                  {/* Финансовый отчёт */}
                  {type === "FINANCIAL" && (
                    <FinancialReportFields
                      shiftPhase={financialShiftPhase}
                      setShiftPhase={setFinancialShiftPhase}
                      admin={financialAdmin}
                      setAdmin={setFinancialAdmin}
                      nalLangame={financialNalLangame}
                      setNalLangame={setFinancialNalLangame}
                      nalFact={financialNalFact}
                      setNalFact={setFinancialNalFact}
                      beznalLangame={financialBeznalLangame}
                      setBeznalLangame={setFinancialBeznalLangame}
                      beznalFact={financialBeznalFact}
                      setBeznalFact={setFinancialBeznalFact}
                      discrepancy={financialDiscrepancy}
                      setDiscrepancy={setFinancialDiscrepancy}
                    />
                  )}

                  {/* Пробковый сбор */}
                  {type === "CORK_FEE" && (
                    <CorkFeeReportFields
                      category={corkCategory}
                      setCategory={setCorkCategory}
                      quantity={corkQuantity}
                      setQuantity={setCorkQuantity}
                      pc={corkPc}
                      setPc={setCorkPc}
                      pcModal={corkPcModal}
                      setPcModal={setCorkPcModal}
                      pcOptions={pcOptions}
                    />
                  )}

                  {/* Состояние столов */}
                  {type === "TABLE_STATUS" && (
                    <TableStatusReportFields
                      admin={tableAdmin}
                      setAdmin={setTableAdmin}
                      shiftPhase={tableShiftPhase}
                      setShiftPhase={setTableShiftPhase}
                    />
                  )}

                  {/* PlayStation */}
                  {type === "PLAYSTATION" && (
                    <PlayStationReportFields
                      time={playstationTime}
                      setTime={setPlaystationTime}
                      pc={playstationPc}
                      setPc={setPlaystationPc}
                      pcModal={playstationPcModal}
                      setPcModal={setPlaystationPcModal}
                      pcOptions={pcOptions}
                    />
                  )}

                  {/* Акции */}
                  {type === "PROMOTION" && (
                    <PromotionReportFields
                      date={promotionDate}
                      setDate={setPromotionDate}
                      phone={promotionPhone}
                      setPhone={setPromotionPhone}
                      clientName={promotionClientName}
                      setClientName={setPromotionClientName}
                      promoType={promotionType}
                      setPromoType={setPromotionType}
                    />
                  )}

                  {/* Накладные */}
                  {type === "VAT_INVOICE" && (
                    <VatInvoiceReportFields
                      date={vatDate}
                      setDate={setVatDate}
                      month={vatMonth}
                      setMonth={setVatMonth}
                      description={vatDescription}
                      setDescription={setVatDescription}
                    />
                  )}

                  <div>
                    <label className="block text-sm font-medium mb-1">Файлы/Изображения</label>
                    <input type="file" multiple accept="image/*" onChange={handleFileChange} className="border rounded px-2 py-1 w-full" />
                    {selectedFiles.length > 0 && <div className="mt-2 text-sm text-gray-600">Выбрано файлов: {selectedFiles.length}</div>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Сумма (если применимо)</label>
                    <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="border rounded px-2 py-1 w-full" placeholder="0" step="0.01" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Заметки</label>
                    <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="border rounded px-2 py-1 w-full" rows={3} placeholder="Дополнительная информация..." />
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <button className="btn-primary flex-1" onClick={save}><NI.Save className="w-4 h-4" /> Сохранить</button>
                  <button className="border px-4 py-2 rounded flex-1" onClick={onClose}>Отмена</button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

// Компоненты полей для каждого типа отчета
function FinancialReportFields(props: any) {
  const {
    shiftPhase, setShiftPhase, admin, setAdmin, nalLangame, setNalLangame, nalFact, setNalFact,
    beznalLangame, setBeznalLangame, beznalFact, setBeznalFact, discrepancy, setDiscrepancy
  } = props;

  const nalMismatch = nalLangame && nalFact && Number(nalLangame) !== Number(nalFact);
  const beznalMismatch = shiftPhase === "END" && beznalLangame && beznalFact && Number(beznalLangame) !== Number(beznalFact);

  return (
    <>
      <div>
        <label className="block text-sm font-medium mb-1">Фаза смены</label>
        <select value={shiftPhase} onChange={(e) => setShiftPhase(e.target.value)} className="border rounded px-2 py-1 w-full">
          <option value="START">Начинаю смену</option>
          <option value="END">Заканчиваю смену</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Администратор</label>
        <input type="text" value={admin} onChange={(e) => setAdmin(e.target.value)} className="border rounded px-2 py-1 w-full" placeholder="Имя администратора" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Нал в Langame (руб.)</label>
        <input type="number" value={nalLangame} onChange={(e) => setNalLangame(e.target.value)} className="border rounded px-2 py-1 w-full" placeholder="1000" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Нал факт (руб.)</label>
        <input type="number" value={nalFact} onChange={(e) => setNalFact(e.target.value)} className="border rounded px-2 py-1 w-full" placeholder="1000" />
      </div>
      {nalMismatch && (
        <>
          <div className="text-red-600 font-medium">⚠ Нал не ровно!</div>
          <div>
            <label className="block text-sm font-medium mb-1">Комментарий о расхождении</label>
            <textarea value={discrepancy} onChange={(e) => setDiscrepancy(e.target.value)} className="border rounded px-2 py-1 w-full" rows={2} placeholder="Почему расхождение, чей минус..." />
          </div>
        </>
      )}
      {shiftPhase === "END" && (
        <>
          <div>
            <label className="block text-sm font-medium mb-1">Безнал в Langame (руб.)</label>
            <input type="number" value={beznalLangame} onChange={(e) => setBeznalLangame(e.target.value)} className="border rounded px-2 py-1 w-full" placeholder="1000" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Безнал факт (руб.)</label>
            <input type="number" value={beznalFact} onChange={(e) => setBeznalFact(e.target.value)} className="border rounded px-2 py-1 w-full" placeholder="1000" />
          </div>
          {beznalMismatch && (
            <>
              <div className="text-red-600 font-medium">⚠ Безнал не ровно!</div>
              <div>
                <label className="block text-sm font-medium mb-1">Комментарий о расхождении</label>
                <textarea value={discrepancy} onChange={(e) => setDiscrepancy(e.target.value)} className="border rounded px-2 py-1 w-full" rows={2} placeholder="Почему расхождение, чей минус..." />
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}

function CorkFeeReportFields(props: any) {
  const { category, setCategory, quantity, setQuantity, pc, setPc, pcModal, setPcModal, pcOptions } = props;
  const prices: Record<string, number> = { NORMAL: 100, LIGHT: 250, STRONG: 500 };
  const total = (prices[category] || 0) * (Number(quantity) || 0);

  return (
    <>
      <div>
        <label className="block text-sm font-medium mb-1">Категория</label>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="border rounded px-2 py-1 w-full">
          <option value="NORMAL">Обычный (100 руб.)</option>
          <option value="LIGHT">Лёгкий Алкоголь (250 руб.)</option>
          <option value="STRONG">Крепкий Алкоголь (500 руб.)</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Кол-во</label>
        <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="border rounded px-2 py-1 w-full" placeholder="1" />
      </div>
      <div className="font-medium">Сумма: {total} руб.</div>
      <div>
        <label className="block text-sm font-medium mb-1">Компьютер/PS5</label>
        <button onClick={() => setPcModal(true)} className="border rounded px-2 py-1 w-full text-left">{pc || "Выбрать ПК"}</button>
        {pcModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded p-4 w-full max-w-md max-h-[400px] overflow-y-auto">
              <div className="grid grid-cols-5 gap-2">
                {pcOptions.map((opt: string) => (
                  <button key={opt} onClick={() => { setPc(opt); setPcModal(false); }} className={`border rounded px-2 py-1 ${pc === opt ? "bg-blue-100" : ""}`}>{opt}</button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function TableStatusReportFields(props: any) {
  const { admin, setAdmin, shiftPhase, setShiftPhase } = props;

  return (
    <>
      <div>
        <label className="block text-sm font-medium mb-1">Администратор</label>
        <input type="text" value={admin} onChange={(e) => setAdmin(e.target.value)} className="border rounded px-2 py-1 w-full" placeholder="Имя администратора" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Время проведения смены</label>
        <select value={shiftPhase} onChange={(e) => setShiftPhase(e.target.value)} className="border rounded px-2 py-1 w-full">
          <option value="START">Начало Смены</option>
          <option value="MIDDLE">Середина Смены</option>
        </select>
      </div>
    </>
  );
}

function PlayStationReportFields(props: any) {
  const { time, setTime, pc, setPc, pcModal, setPcModal, pcOptions } = props;

  return (
    <>
      <div>
        <label className="block text-sm font-medium mb-1">Время сеанса</label>
        <input type="text" value={time} onChange={(e) => setTime(e.target.value)} className="border rounded px-2 py-1 w-full" placeholder="Например: PS5 Час" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Компьютер/PS5</label>
        <button onClick={() => setPcModal(true)} className="border rounded px-2 py-1 w-full text-left">{pc || "Выбрать ПК"}</button>
        {pcModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded p-4 w-full max-w-md max-h-[400px] overflow-y-auto">
              <div className="grid grid-cols-5 gap-2">
                {pcOptions.map((opt: string) => (
                  <button key={opt} onClick={() => { setPc(opt); setPcModal(false); }} className={`border rounded px-2 py-1 ${pc === opt ? "bg-blue-100" : ""}`}>{opt}</button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function PromotionReportFields(props: any) {
  const { date, setDate, phone, setPhone, clientName, setClientName, promoType, setPromoType } = props;

  return (
    <>
      <div>
        <label className="block text-sm font-medium mb-1">Дата</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="border rounded px-2 py-1 w-full" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Последние 4 цифры номера телефона</label>
        <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} className="border rounded px-2 py-1 w-full" placeholder="1234" maxLength={4} />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Имя клиента</label>
        <input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)} className="border rounded px-2 py-1 w-full" placeholder="Имя" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Тип акции</label>
        <select value={promoType} onChange={(e) => setPromoType(e.target.value)} className="border rounded px-2 py-1 w-full">
          <option value="REVIEW">Отзыв</option>
          <option value="EAT_PLAY">Кто больше ест - тот больше играет</option>
        </select>
      </div>
    </>
  );
}

function VatInvoiceReportFields(props: any) {
  const { date, setDate, month, setMonth, description, setDescription } = props;

  return (
    <>
      <div>
        <label className="block text-sm font-medium mb-1">Дата</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="border rounded px-2 py-1 w-full" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Месяц</label>
        <input type="text" value={month} onChange={(e) => setMonth(e.target.value)} className="border rounded px-2 py-1 w-full" placeholder="Ноябрь 2025" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Что пришло/на что потрачено</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="border rounded px-2 py-1 w-full" rows={3} placeholder="Описание накладной" />
      </div>
    </>
  );
}

// Модальное окно для просмотра отчета с файлами
function ReportViewModal({ isOpen, onClose, report, onEdit, onDelete }: { isOpen: boolean; onClose: () => void; report: Report; onEdit?: () => void; onDelete?: () => void }) {
  const { data: session } = useSession();
  const role = ((session as any)?.user as any)?.role as string | undefined;
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [lastTouchDistance, setLastTouchDistance] = useState(0);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("ru-RU", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleWheel = (e: React.WheelEvent) => {
    // Зум простым колесиком без Ctrl
    if (!e.ctrlKey) {
      e.preventDefault();
      const delta = e.deltaY * -0.01;
      setScale((prev) => Math.min(Math.max(1, prev + delta), 5));
    }
    // Зум с Ctrl (браузерный зум отключен)
    else {
      e.preventDefault();
      const delta = e.deltaY * -0.01;
      setScale((prev) => Math.min(Math.max(1, prev + delta), 5));
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
      setLastTouchDistance(distance);
      setIsDragging(false);
    } else if (e.touches.length === 1 && scale > 1) {
      setIsDragging(true);
      setDragStart({ x: e.touches[0].clientX - position.x, y: e.touches[0].clientY - position.y });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
      if (lastTouchDistance !== 0) {
        const scaleChange = distance / lastTouchDistance;
        setScale((prev) => Math.min(Math.max(1, prev * scaleChange), 5));
      }
      setLastTouchDistance(distance);
    } else if (isDragging && scale > 1 && e.touches.length === 1) {
      setPosition({ x: e.touches[0].clientX - dragStart.x, y: e.touches[0].clientY - dragStart.y });
    }
  };

  const handleTouchEnd = () => {
    setLastTouchDistance(0);
    setIsDragging(false);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const rotateImage = useCallback(() => {
    setRotation((prev) => (prev + 90) % 360);
  }, []);

  const resetTransform = () => {
    setScale(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
    setIsDragging(false);
  };

  const zoomIn = () => setScale((prev) => Math.min(prev + 0.2, 5));
  const zoomOut = () => setScale((prev) => Math.max(prev - 0.2, 1));

  const isDirector = role === "DIRECTOR";
  const isEmployee = role === "EMPLOYEE";

  // Горячие клавиши для поворота и закрытия
  useEffect(() => {
    if (!isOpen || selectedImageIndex === null) return;
    
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setSelectedImageIndex(null);
        resetTransform();
      } else if (e.key === '+' || e.key === '=' || e.key === 'Equal') {
        // Shift++ может быть, поэтому проверяем shiftKey
        if (!e.shiftKey) {
          e.preventDefault();
          rotateImage();
        }
      } else if (e.key === '-' || e.key === '_' || e.key === 'Minus') {
        e.preventDefault();
        rotateImage();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isOpen, selectedImageIndex, rotateImage]);

  const renderReportData = () => {
    if (report.type === "FINANCIAL" && report.data) {
      const d = report.data;
      return (
        <div className="space-y-2">
          <div className="text-white"><strong style={{ color: "rgba(255, 255, 255, 0.7)" }}>Фаза смены:</strong> {d.shiftPhase === "START" ? "Начало смены" : "Конец смены"}</div>
          {d.admin && <div className="text-white"><strong style={{ color: "rgba(255, 255, 255, 0.7)" }}>Администратор:</strong> {d.admin}</div>}
          <div className="text-white"><strong style={{ color: "rgba(255, 255, 255, 0.7)" }}>Нал в Langame:</strong> {d.nalLangame ? Number(d.nalLangame).toFixed(2) : "-"} руб.</div>
          <div className="text-white"><strong style={{ color: "rgba(255, 255, 255, 0.7)" }}>Нал факт:</strong> {d.nalFact ? Number(d.nalFact).toFixed(2) : "-"} руб.</div>
          {d.shiftPhase === "END" && (
            <>
              <div className="text-white"><strong style={{ color: "rgba(255, 255, 255, 0.7)" }}>Безнал в Langame:</strong> {d.beznalLangame ? Number(d.beznalLangame).toFixed(2) : "-"} руб.</div>
              <div className="text-white"><strong style={{ color: "rgba(255, 255, 255, 0.7)" }}>Безнал факт:</strong> {d.beznalFact ? Number(d.beznalFact).toFixed(2) : "-"} руб.</div>
            </>
          )}
          {d.discrepancy && (
            <div className="text-red-500 bg-red-500/10 p-3 rounded border border-red-500/30">
              <strong>Расхождение:</strong> {d.discrepancy}
            </div>
          )}
        </div>
      );
    }
    if (report.type === "CORK_FEE" && report.data) {
      const d = report.data;
      const prices: Record<string, string> = { NORMAL: "Обычный (100 руб.)", LIGHT: "Лёгкий Алкоголь (250 руб.)", STRONG: "Крепкий Алкоголь (500 руб.)" };
      return (
        <div className="space-y-2">
          <div className="text-white"><strong style={{ color: "rgba(255, 255, 255, 0.7)" }}>Категория:</strong> {prices[d.category] || d.category}</div>
          <div className="text-white"><strong style={{ color: "rgba(255, 255, 255, 0.7)" }}>Количество:</strong> {d.quantity || 0}</div>
          <div className="text-white"><strong style={{ color: "rgba(255, 255, 255, 0.7)" }}>Сумма:</strong> {(prices[d.category]?.match(/\d+/)?.[0] ? Number(prices[d.category].match(/\d+/)?.[0]) * (d.quantity || 0) : 0).toFixed(2)} руб.</div>
          {d.pc && <div className="text-white"><strong style={{ color: "rgba(255, 255, 255, 0.7)" }}>ПК/PS5:</strong> {d.pc}</div>}
        </div>
      );
    }
    if (report.type === "TABLE_STATUS" && report.data) {
      const d = report.data;
      return (
        <div className="space-y-2">
          {d.admin && <div className="text-white"><strong style={{ color: "rgba(255, 255, 255, 0.7)" }}>Администратор:</strong> {d.admin}</div>}
          <div className="text-white"><strong style={{ color: "rgba(255, 255, 255, 0.7)" }}>Время проведения:</strong> {d.shiftPhase === "START" ? "Начало смены" : "Середина смены"}</div>
        </div>
      );
    }
    if (report.type === "PLAYSTATION" && report.data) {
      const d = report.data;
      return (
        <div className="space-y-2">
          {d.time && <div className="text-white"><strong style={{ color: "rgba(255, 255, 255, 0.7)" }}>Время сеанса:</strong> {d.time}</div>}
          {d.pc && <div className="text-white"><strong style={{ color: "rgba(255, 255, 255, 0.7)" }}>ПК/PS5:</strong> {d.pc}</div>}
        </div>
      );
    }
    if (report.type === "PROMOTION" && report.data) {
      const d = report.data;
      return (
        <div className="space-y-2">
          {d.date && <div className="text-white"><strong style={{ color: "rgba(255, 255, 255, 0.7)" }}>Дата:</strong> {new Date(d.date).toLocaleDateString("ru-RU")}</div>}
          {d.phone && <div className="text-white"><strong style={{ color: "rgba(255, 255, 255, 0.7)" }}>Телефон:</strong> {d.phone}</div>}
          {d.clientName && <div className="text-white"><strong style={{ color: "rgba(255, 255, 255, 0.7)" }}>Имя клиента:</strong> {d.clientName}</div>}
          <div className="text-white"><strong style={{ color: "rgba(255, 255, 255, 0.7)" }}>Тип акции:</strong> {d.promoType === "REVIEW" ? "Отзыв" : "Кто больше ест - тот больше играет"}</div>
        </div>
      );
    }
    if (report.type === "VAT_INVOICE" && report.data) {
      const d = report.data;
      return (
        <div className="space-y-2">
          {d.date && <div className="text-white"><strong style={{ color: "rgba(255, 255, 255, 0.7)" }}>Дата:</strong> {new Date(d.date).toLocaleDateString("ru-RU")}</div>}
          {d.month && <div className="text-white"><strong style={{ color: "rgba(255, 255, 255, 0.7)" }}>Месяц:</strong> {d.month}</div>}
          {d.description && <div className="text-white"><strong style={{ color: "rgba(255, 255, 255, 0.7)" }}>Описание:</strong> {d.description}</div>}
        </div>
      );
    }
    return null;
  };

  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.jfif'];
  const isImage = (filename: string) => {
    const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    return imageExtensions.includes(ext);
  };

  return (
    <>
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0">
          <div className="fixed inset-0 bg-black/50" />
        </Transition.Child>
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
              <Dialog.Panel className="modal-panel w-full max-w-4xl p-6 max-h-[90vh] overflow-y-auto">
                <Dialog.Title className="text-xl font-semibold mb-4 text-white">
                  {reportTypeLabels[report.type]}
                </Dialog.Title>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-white">
                      <strong style={{ color: "rgba(255, 255, 255, 0.7)" }}>Сотрудник:</strong> {report.employee.name}
                    </div>
                    <div className="text-white">
                      <strong style={{ color: "rgba(255, 255, 255, 0.7)" }}>Дата создания:</strong> {formatDate(report.createdAt)}
                    </div>
                    {report.shift && (
                      <div className="text-white">
                        <strong style={{ color: "rgba(255, 255, 255, 0.7)" }}>Смена:</strong> {new Date(report.shift.date).toLocaleDateString("ru-RU")}
                      </div>
                    )}
                    {report.amount && (
                      <div className="text-white">
                        <strong style={{ color: "rgba(255, 255, 255, 0.7)" }}>Сумма:</strong> {Number(report.amount).toFixed(2)} руб.
                      </div>
                    )}
                  </div>

                  <div className="text-white">{renderReportData()}</div>

                  {report.notes && (
                    <div className="text-white">
                      <strong style={{ color: "rgba(255, 255, 255, 0.7)" }}>Заметки:</strong>
                      <div className="mt-1 p-3 bg-gray-900 rounded border border-gray-700">{report.notes}</div>
                    </div>
                  )}

                  {report.files && report.files.length > 0 && (
                    <div>
                      <strong className="block mb-2 text-white">Файлы ({report.files.length}):</strong>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {report.files.map((file, index) => {
                          const fileUrl = `/uploads/${report.id}/${file}`;
                          if (isImage(file)) {
                            return (
                              <div key={index} className="relative group">
                                <img
                                  src={fileUrl}
                                  alt={file}
                                  className="w-full h-32 object-cover rounded border border-red-500/30 cursor-pointer hover:opacity-80 relative z-10"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const imageFiles = report.files.filter(f => isImage(f));
                                    const imageIndex = imageFiles.indexOf(file);
                                    setSelectedImageIndex(imageIndex);
                                  }}
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2YzZjRmNiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5Yzk5Y2MiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5ObyBJbWFnZTwvdGV4dD48L3N2Zz4=`;
                                  }}
                                />
                                <div className="absolute inset-0 pointer-events-none bg-black/0 group-hover:bg-black/20 rounded flex items-center justify-center transition">
                                  <div className="text-white opacity-0 group-hover:opacity-100 text-xs">Нажмите для просмотра</div>
                                </div>
                              </div>
                            );
                          }
                          return (
                            <div key={index} className="border border-red-500/30 rounded p-3 text-center bg-gray-900">
                              <div className="text-2xl mb-1">📄</div>
                              <div className="text-xs truncate text-white">{file}</div>
                              <a
                                href={fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-red-500 text-xs hover:underline mt-1 block"
                              >
                                Открыть
                              </a>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex gap-2">
                  {onEdit && (isEmployee || isDirector) && (
                    <button className="btn-ghost" onClick={() => {
                      onEdit();
                      onClose();
                    }}>
                      Редактировать
                    </button>
                  )}
                  {onDelete && isDirector && (
                    <button className="btn-ghost border-red-500/50 text-red-500 hover:bg-red-500/10" onClick={() => {
                      if (window.confirm("Вы уверены, что хотите удалить этот отчет?")) {
                        onDelete();
                        onClose();
                      }
                    }}>
                      Удалить
                    </button>
                  )}
                  <button className="btn-primary ml-auto" onClick={onClose}>Закрыть</button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>

    {/* Модальное окно для полноэкранного просмотра изображений */}
    {selectedImageIndex !== null && (
      <div className="fixed inset-0 bg-black/90 z-[100]">
        {/* Backdrop, который закрывает окно при клике */}
        <div 
          className="absolute inset-0"
          onClick={(e) => {
            // Закрываем только если клик не на интерактивном элементе
            if (e.target === e.currentTarget) {
              setSelectedImageIndex(null);
              resetTransform();
            }
          }}
        />
        <div className="relative w-full h-full overflow-auto pointer-events-none">
          <button
            className="absolute top-4 right-4 text-white text-2xl hover:text-gray-300 z-10 bg-black/50 rounded-full p-2 pointer-events-auto"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedImageIndex(null);
              resetTransform();
            }}
          >
            ✕
          </button>

          {/* Панель управления */}
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 flex gap-2 z-10 bg-black/50 rounded-lg p-2 pointer-events-auto">
            <button onClick={(e) => { e.stopPropagation(); rotateImage(); }} className="text-white px-3 py-1 rounded hover:bg-black/30">
              🔄 Повернуть
            </button>
            <button onClick={(e) => { e.stopPropagation(); resetTransform(); }} className="text-white px-3 py-1 rounded hover:bg-black/30">
              ↺ Сброс
            </button>
            <button onClick={(e) => { e.stopPropagation(); zoomIn(); }} className="text-white px-3 py-1 rounded hover:bg-black/30">
              ➕
            </button>
            <button onClick={(e) => { e.stopPropagation(); zoomOut(); }} className="text-white px-3 py-1 rounded hover:bg-black/30">
              ➖
            </button>
          </div>

          {/* Навигация */}
          {selectedImageIndex > 0 && (
            <button
              className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white text-4xl hover:text-gray-300 bg-black/50 rounded-full p-3 z-10 pointer-events-auto"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedImageIndex(selectedImageIndex - 1);
                resetTransform();
              }}
            >
              ‹
            </button>
          )}
          {selectedImageIndex < report.files.filter(f => isImage(f)).length - 1 && (
            <button
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white text-4xl hover:text-gray-300 bg-black/50 rounded-full p-3 z-10 pointer-events-auto"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedImageIndex(selectedImageIndex + 1);
                resetTransform();
              }}
            >
              ›
            </button>
          )}

          {report.files.filter(f => isImage(f)).length > 0 && (
            <div 
              className="flex items-center justify-center min-h-screen p-4 pointer-events-auto" 
              onWheel={handleWheel}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              style={{ cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
            >
              <img
                src={`/uploads/${report.id}/${report.files.filter(f => isImage(f))[selectedImageIndex]}`}
                alt={`Изображение ${selectedImageIndex + 1}`}
                className="max-w-full max-h-screen object-contain transition-transform duration-200 select-none"
                style={{ 
                  transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
                  cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
                  touchAction: 'none'
                }}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={handleMouseDown}
                draggable={false}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNjAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iIzMzMyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjAiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZSBub3QgZm91bmQ8L3RleHQ+PC9zdmc+`;
                }}
              />
            </div>
          )}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white text-center z-10 bg-black/50 rounded-lg px-4 py-2 pointer-events-auto">
            {selectedImageIndex + 1} / {report.files.filter(f => isImage(f)).length} | Масштаб: {Math.round(scale * 100)}%
          </div>
        </div>
      </div>
    )}
  </>
  );
}
