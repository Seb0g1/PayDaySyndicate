"use client";
import useSWR from "swr";
import { Fragment, useMemo, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { useSession } from "next-auth/react";
import { useSuccess } from "@/components/SuccessProvider";
import { useError } from "@/components/ErrorProvider";
import { format, startOfWeek, addDays, addWeeks, subWeeks, eachDayOfInterval, isSameDay } from "date-fns";
import { ru } from "date-fns/locale";

type Shift = {
  id: string;
  employeeId: string;
  date: string;
  startTime: string;
  endTime: string;
  type: "MORNING" | "EVENING" | "NIGHT" | "CUSTOM";
  attended: boolean;
  status: "UNMARKED" | "ATTENDED" | "ABSENT" | "LATE";
  hours: number;
  employee?: { id: string; name: string };
};
type Employee = { id: string; name: string };

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function ShiftsPage() {
  const { data: employees } = useSWR<Employee[]>("/api/employees", fetcher);
  const [employeeId, setEmployeeId] = useState("");
  const { data, mutate } = useSWR<Shift[]>(`/api/shifts?employeeId=${employeeId}`, fetcher);
  const [currentWeek, setCurrentWeek] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const { showSuccess } = useSuccess();
  const { showError } = useError();
  const { data: session } = useSession();
  const role = ((session as any)?.user as any)?.role as string | undefined;
  const isDirector = role === "DIRECTOR";
  const [penalties, setPenalties] = useState<any[]>([]);
  const [bonuses, setBonuses] = useState<any[]>([]);
  const [hookahs, setHookahs] = useState<any[]>([]);
  
  async function refreshAdjustments(shiftId: string) {
    const [p, b, h] = await Promise.all([
      fetch(`/api/shifts/${shiftId}/penalties`).then(r=>r.json()),
      fetch(`/api/shifts/${shiftId}/bonuses`).then(r=>r.json()),
      fetch(`/api/shifts/${shiftId}/hookahs`).then(r=>r.json()),
    ]);
    setPenalties(p); setBonuses(b); setHookahs(h);
  }

  const weekDays = useMemo(() => {
    return eachDayOfInterval({
      start: currentWeek,
      end: addDays(currentWeek, 6)
    });
  }, [currentWeek]);

  const shiftsByDayAndEmployee = useMemo(() => {
    const map = new Map<string, Shift[]>();
    (data ?? []).forEach(shift => {
      const shiftDate = new Date(shift.date);
      weekDays.forEach(day => {
        if (isSameDay(shiftDate, day)) {
          const key = `${day.toISOString()}_${shift.employeeId}`;
          if (!map.has(key)) {
            map.set(key, []);
          }
          map.get(key)!.push(shift);
        }
      });
    });
    return map;
  }, [data, weekDays]);

  const getShiftTypeColor = (type: Shift["type"]) => {
    switch (type) {
      case "MORNING": return "bg-green-600";
      case "NIGHT": return "bg-blue-600";
      case "EVENING": return "bg-purple-600";
      default: return "bg-gray-600";
    }
  };

  const getShiftTypeLabel = (type: Shift["type"]) => {
    switch (type) {
      case "MORNING": return "День";
      case "NIGHT": return "Ночь";
      case "EVENING": return "Вечер";
      default: return "Другая";
    }
  };

  const formatTime = (timeStr: string) => {
    const date = new Date(timeStr);
    return format(date, "HH:mm");
  };

  const [open, setOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [form, setForm] = useState<{ type: "MORNING" | "NIGHT" | "CUSTOM"; start: string; end: string }>({ type: "MORNING", start: "09:00", end: "21:00" });
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);

  const openModal = (day: Date) => {
    if (!employeeId) {
      showError("Сначала выберите сотрудника");
      return;
    }
    setSelectedDay(day);
    setOpen(true);
  };

  const applyTypePreset = (t: "MORNING" | "NIGHT" | "CUSTOM") => {
    if (t === "MORNING") setForm({ type: t, start: "09:00", end: "21:00" });
    else if (t === "NIGHT") setForm({ type: t, start: "21:00", end: "09:00" });
    else setForm({ type: t, start: "09:00", end: "21:00" });
  };

  const createShift = async () => {
    if (!selectedDay || !employeeId) return;
    const dateLocal = format(selectedDay, "yyyy-MM-dd");
    const startISO = new Date(`${dateLocal}T${form.start}:00`).toISOString();
    let endDate = new Date(`${dateLocal}T${form.end}:00`);
    const startDate = new Date(`${dateLocal}T${form.start}:00`);
    if (endDate <= startDate) {
      endDate = new Date(endDate.getTime() + 24 * 60 * 60 * 1000);
    }
    const endISO = endDate.toISOString();
    const res = await fetch("/api/shifts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeId, date: startISO, startTime: startISO, endTime: endISO, type: form.type }),
    });
    if (!res.ok) {
      showError("Недостаточно прав для создания смены");
      return;
    }
    showSuccess("Смена добавлена!");
    setOpen(false);
    setSelectedDay(null);
    mutate();
  };

  const onSelectShift = async (shift: Shift) => {
    setSelectedShift(shift);
    await refreshAdjustments(shift.id);
    setDetailOpen(true);
  };

  const filteredEmployees = useMemo(() => {
    if (!employeeId) return employees ?? [];
    return (employees ?? []).filter(e => e.id === employeeId);
  }, [employees, employeeId]);

  return (
    <div className="space-y-4">
      <div className="card p-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs mb-1" style={{ color: "rgba(255, 255, 255, 0.7)" }}>Сотрудник</label>
            <select 
              value={employeeId} 
              onChange={(e) => setEmployeeId(e.target.value)} 
              className="border rounded px-2 py-1 w-full bg-gray-900 text-white"
            >
              <option value="">Все сотрудники</option>
              {(employees ?? []).map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded"
            >
              ←
            </button>
            <div className="text-white font-semibold min-w-[200px] text-center">
              {format(currentWeek, "d MMM", { locale: ru })} - {format(addDays(currentWeek, 6), "d MMM yyyy", { locale: ru })}
            </div>
            <button
              onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded"
            >
              →
            </button>
            <button
              onClick={() => setCurrentWeek(startOfWeek(new Date(), { weekStartsOn: 1 }))}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
            >
              Сегодня
            </button>
          </div>
        </div>
      </div>

      <div className="card p-4 overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr>
              <th className="p-2 text-left text-white font-semibold border-b" style={{ borderColor: "rgba(255, 255, 255, 0.1)" }}>
                Сотрудник
              </th>
              {weekDays.map((day, idx) => (
                <th
                  key={idx}
                  className={`p-2 text-center text-white font-semibold border-b min-w-[120px] ${
                    day.getDay() === 0 || day.getDay() === 6 ? "bg-red-900/20" : ""
                  }`}
                  style={{ borderColor: "rgba(255, 255, 255, 0.1)" }}
                >
                  <div className="text-xs text-gray-400">
                    {format(day, "EEE", { locale: ru })}
                  </div>
                  <div className="text-sm">
                    {format(day, "d MMM", { locale: ru })}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.map((employee) => (
              <tr key={employee.id} className="border-b" style={{ borderColor: "rgba(255, 255, 255, 0.1)" }}>
                <td className="p-2 text-white font-medium sticky left-0 bg-gray-900 z-10">
                  {employee.name}
                </td>
                {weekDays.map((day, dayIdx) => {
                  const key = `${day.toISOString()}_${employee.id}`;
                  const dayShifts = shiftsByDayAndEmployee.get(key) || [];
                  const isToday = isSameDay(day, new Date());
                  
                  return (
                    <td
                      key={dayIdx}
                      className={`p-1 text-center align-top min-h-[80px] ${
                        isToday ? "bg-blue-900/20" : ""
                      } ${day.getDay() === 0 || day.getDay() === 6 ? "bg-red-900/10" : ""}`}
                      style={{ borderColor: "rgba(255, 255, 255, 0.05)" }}
                    >
                      {isDirector && (
                        <button
                          onClick={() => {
                            setEmployeeId(employee.id);
                            openModal(day);
                          }}
                          className="w-full h-6 text-xs text-gray-400 hover:text-white hover:bg-gray-700 rounded mb-1"
                          title="Добавить смену"
                        >
                          +
                        </button>
                      )}
                      <div className="space-y-1">
                        {dayShifts.map((shift) => (
                          <div
                            key={shift.id}
                            onClick={() => onSelectShift(shift)}
                            className={`${getShiftTypeColor(shift.type)} text-white text-xs p-1 rounded cursor-pointer hover:opacity-80 transition-opacity`}
                            title={`${getShiftTypeLabel(shift.type)}: ${formatTime(shift.startTime)} - ${formatTime(shift.endTime)}`}
                          >
                            <div className="font-semibold">{getShiftTypeLabel(shift.type)}</div>
                            <div className="text-[10px] opacity-90">
                              {formatTime(shift.startTime)}-{formatTime(shift.endTime)}
                            </div>
                            {shift.status === "ATTENDED" && (
                              <div className="text-[10px] opacity-75">✓</div>
                            )}
                            {shift.status === "ABSENT" && (
                              <div className="text-[10px] opacity-75">✗</div>
                            )}
                            {shift.status === "LATE" && (
                              <div className="text-[10px] opacity-75">⚠</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Модальное окно для создания смены */}
      <Transition appear show={open} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100"
            leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/30" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-200" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100"
                leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="modal-panel w-full max-w-lg p-6">
                  <Dialog.Title className="text-xl font-semibold text-white mb-4">
                    Добавить смену на {selectedDay && format(selectedDay, "d MMMM yyyy", { locale: ru })}
                  </Dialog.Title>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="block text-xs mb-1" style={{ color: "rgba(255, 255, 255, 0.7)" }}>Тип</label>
                      <select
                        value={form.type}
                        onChange={(e) => applyTypePreset(e.target.value as any)}
                        className="border rounded px-2 py-2 w-full bg-gray-900 text-white"
                      >
                        <option value="MORNING">День</option>
                        <option value="NIGHT">Ночь</option>
                        <option value="CUSTOM">Другая</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs mb-1" style={{ color: "rgba(255, 255, 255, 0.7)" }}>Начало</label>
                      <input 
                        type="time" 
                        value={form.start} 
                        onChange={(e) => setForm((f) => ({ ...f, start: e.target.value }))} 
                        className="border rounded px-2 py-2 w-full bg-gray-900 text-white" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs mb-1" style={{ color: "rgba(255, 255, 255, 0.7)" }}>Окончание</label>
                      <input 
                        type="time" 
                        value={form.end} 
                        onChange={(e) => setForm((f) => ({ ...f, end: e.target.value }))} 
                        className="border rounded px-2 py-2 w-full bg-gray-900 text-white" 
                      />
                    </div>
                  </div>
                  <div className="mt-5 flex justify-end gap-2">
                    <button className="btn-ghost px-3 py-2" onClick={() => setOpen(false)}>Отмена</button>
                    <button className="btn-primary" onClick={createShift}>Сохранить</button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Детали смены и штрафы/бонусы/кальяны */}
      <Transition appear show={detailOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setDetailOpen(false)}>
          <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0">
            <div className="fixed inset-0 bg-black/30" />
          </Transition.Child>
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                <Dialog.Panel className="modal-panel w-full max-w-3xl p-4 sm:p-6">
                  <Dialog.Title className="text-xl font-semibold text-white mb-4">Смена</Dialog.Title>
                  {selectedShift && (
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                      <div className="space-y-3">
                        <div className="text-sm text-gray-300">
                          {new Date(selectedShift.startTime).toLocaleString("ru-RU")} — {new Date(selectedShift.endTime).toLocaleString("ru-RU")}
                        </div>
                        <div className="flex gap-2">
                          <button 
                            className="btn-ghost" 
                            onClick={async () => { 
                              await fetch(`/api/shifts/${selectedShift.id}`, { method: 'DELETE' }); 
                              setDetailOpen(false); 
                              mutate(); 
                            }}
                          >
                            Удалить смену
                          </button>
                          <button 
                            className="btn-ghost" 
                            onClick={async () => { 
                              const status = prompt('Статус: ATTENDED/ABSENT/LATE', 'ATTENDED'); 
                              if(!status) return; 
                              await fetch(`/api/shifts/${selectedShift.id}`, { 
                                method:'PATCH', 
                                headers:{'Content-Type':'application/json'}, 
                                body: JSON.stringify({ status }) 
                              }); 
                              mutate(); 
                            }}
                          >
                            Изменить статус
                          </button>
                        </div>
                      </div>
                      {isDirector && (
                        <div className="space-y-6">
                          <div>
                            <div className="font-semibold mb-2 text-white">Штрафы</div>
                            <div className="grid grid-cols-3 items-center gap-2">
                              <input id="p-amount" placeholder="Сумма" type="number" className="border rounded px-2 py-2 w-full bg-gray-900 text-white" />
                              <input id="p-reason" placeholder="Причина" className="border rounded px-2 py-2 w-full bg-gray-900 text-white" />
                              <button className="btn-primary w-full" onClick={async ()=>{ const amt = Number((document.getElementById('p-amount') as HTMLInputElement).value||0); const rsn = (document.getElementById('p-reason') as HTMLInputElement).value; if(!amt||!rsn) return; await fetch(`/api/shifts/${selectedShift.id}/penalties`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ amount: amt, reason: rsn }) }); refreshAdjustments(selectedShift.id); }}>Добавить</button>
                            </div>
                            <ul className="text-sm space-y-1 mt-2">
                              {penalties.map((p:any)=> (
                                <li key={p.id} className="flex items-center justify-between border rounded px-3 py-2" style={{ borderColor: "rgba(255, 255, 255, 0.1)" }}><span className="text-gray-300">-{Number(p.amount).toFixed(2)} ₽ — {p.reason}</span><button className="text-red-500 hover:text-red-400" onClick={async ()=>{ await fetch(`/api/shifts/penalties/${p.id}`, { method:'DELETE' }); refreshAdjustments(selectedShift.id); }}>Удалить</button></li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <div className="font-semibold mb-2 text-white">Бонус за смену</div>
                            <div className="grid grid-cols-3 items-center gap-2 mb-1">
                              <input id="b-amount" placeholder="Сумма" type="number" className="border rounded px-2 py-2 w-full bg-gray-900 text-white" />
                              <input id="b-reason" placeholder="Причина" className="border rounded px-2 py-2 w-full bg-gray-900 text-white" />
                              <button className="btn-primary w-full" onClick={async ()=>{ const amt = Number((document.getElementById('b-amount') as HTMLInputElement).value||0); const rsn = (document.getElementById('b-reason') as HTMLInputElement).value; if(!amt||!rsn) return; await fetch(`/api/shifts/${selectedShift.id}/bonuses`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ amount: amt, reason: rsn }) }); refreshAdjustments(selectedShift.id); }}>Добавить</button>
                            </div>
                            <ul className="text-sm space-y-1 mt-2">
                              {bonuses.map((p:any)=> (
                                <li key={p.id} className="flex items-center justify-between border rounded px-3 py-2" style={{ borderColor: "rgba(255, 255, 255, 0.1)" }}><span className="text-gray-300">+{Number(p.amount).toFixed(2)} ₽ — {p.reason}</span><button className="text-red-500 hover:text-red-400" onClick={async ()=>{ await fetch(`/api/shifts/bonuses/${p.id}`, { method:'DELETE' }); refreshAdjustments(selectedShift.id); }}>Удалить</button></li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <div className="font-semibold mb-2 text-white">Кальяны</div>
                            <div className="grid grid-cols-3 items-center gap-2">
                              <input id="h-qty" placeholder="Кол-во" type="number" className="border rounded px-2 py-2 w-full bg-gray-900 text-white" />
                              <input id="h-amount" placeholder="₽ за 1 (по умолчанию 200)" type="number" className="border rounded px-2 py-2 w-full bg-gray-900 text-white" />
                              <button className="btn-primary w-full" onClick={async ()=>{ const qty = Number((document.getElementById('h-qty') as HTMLInputElement).value||0); const ap = Number((document.getElementById('h-amount') as HTMLInputElement).value||0); if(!qty) return; await fetch(`/api/shifts/${selectedShift.id}/hookahs`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ qty, amountPer: ap||undefined }) }); refreshAdjustments(selectedShift.id); }}>Добавить</button>
                            </div>
                            <ul className="text-sm space-y-1 mt-2">
                              {hookahs.map((h:any)=> (
                                <li key={h.id} className="flex items-center justify-between border rounded px-3 py-2" style={{ borderColor: "rgba(255, 255, 255, 0.1)" }}><span className="text-gray-300">+{h.qty} × {Number(h.amountPer).toFixed(2)} ₽</span><button className="text-red-500 hover:text-red-400" onClick={async ()=>{ await fetch(`/api/shifts/hookahs/${h.id}`, { method:'DELETE' }); refreshAdjustments(selectedShift.id); }}>Удалить</button></li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}
