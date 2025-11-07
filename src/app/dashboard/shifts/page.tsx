"use client";
import { Calendar, dateFnsLocalizer, Views } from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { format, parse, startOfWeek, getDay } from "date-fns";
import useSWR from "swr";
import { Fragment, useMemo, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { useSession } from "next-auth/react";
import { useSuccess } from "@/components/SuccessProvider";
import { useError } from "@/components/ErrorProvider";

const locales = { ru: require("date-fns/locale/ru") };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }), getDay, locales });

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
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const { showSuccess } = useSuccess();
  const { showError } = useError();
  const ruType = (t: Shift["type"]) => (t === "NIGHT" ? "Ночь" : t === "MORNING" ? "День" : "Другая");
  const events = useMemo(
    () =>
      (data ?? []).map((s) => {
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
      }),
    [data]
  );

  const [open, setOpen] = useState(false);
  const [slot, setSlot] = useState<{ start: Date; end: Date } | null>(null);
  const [form, setForm] = useState<{ type: "MORNING" | "NIGHT" | "CUSTOM"; start: string; end: string }>({ type: "MORNING", start: "09:00", end: "21:00" });
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
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

  const openModal = ({ start, end }: { start: Date; end: Date }) => {
    if (!employeeId) {
      alert("Сначала выберите сотрудника");
      return;
    }
    setSlot({ start, end });
    setOpen(true);
  };

  const applyTypePreset = (t: "MORNING" | "NIGHT" | "CUSTOM") => {
    if (t === "MORNING") setForm({ type: t, start: "09:00", end: "21:00" });
    else if (t === "NIGHT") setForm({ type: t, start: "21:00", end: "09:00" });
    else setForm({ type: t, start: "09:00", end: "21:00" });
  };

  const createShift = async () => {
    if (!slot) return;
    // Формируем время на основе локальной даты выбранной ячейки, чтобы избежать смещения по таймзоне
    const dateLocal = format(slot.start, "yyyy-MM-dd");
    const startISO = new Date(`${dateLocal}T${form.start}:00`).toISOString();
    // Ночная смена: если окончание раньше начала — перенос на следующий день
    let endDate = new Date(`${dateLocal}T${form.end}:00`);
    const startDate = new Date(`${dateLocal}T${form.start}:00`);
    if (endDate <= startDate) {
      endDate = new Date(endDate.getTime() + 24 * 60 * 60 * 1000);
    }
    const endISO = endDate.toISOString();
    const res = await fetch("/api/shifts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Для поля date используем дату начала смены
      body: JSON.stringify({ employeeId, date: startISO, startTime: startISO, endTime: endISO, type: form.type }),
    });
    if (!res.ok) {
      showError("Недостаточно прав для создания смены");
      return;
    }
    showSuccess("Смена добавлена!");
    setOpen(false);
    setSlot(null);
    mutate();
  };

  const onSelectEvent = async (e: any) => {
    const shift: Shift = e.resource;
    setSelectedShift(shift);
    await refreshAdjustments(shift.id);
    setDetailOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="card p-3">
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className="block text-xs mb-1" style={{ color: "rgba(255, 255, 255, 0.7)" }}>Сотрудник</label>
            <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className="border rounded px-2 py-1 w-full">
              <option value="">Все</option>
              {(employees ?? []).map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
      <div style={{ height: '70vh' }} className="card p-2">
        <Calendar
          selectable
          localizer={localizer}
          events={events}
          defaultView={Views.MONTH}
          date={currentDate}
          onNavigate={(d) => setCurrentDate(d)}
          onSelectEvent={onSelectEvent}
          onSelectSlot={openModal as any}
          step={60}
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
            const day = getDay(date); // 0 вс, 6 сб
            if (day === 0 || day === 6) {
              return { style: { outline: "2px solid #ef4444", outlineOffset: "-1px" } } as any;
            }
            return {} as any;
          }}
          eventPropGetter={(event) => {
            const s = event.resource as Shift;
            const base = { style: { backgroundColor: "#2563eb", borderRadius: 6, color: "#fff", border: 0, padding: 2 } } as any;
            if (s.type === "NIGHT") base.style.backgroundColor = "#0ea5e9"; // голубой
            if (s.type === "MORNING") base.style.backgroundColor = "#22c55e"; // зелёный
            return base;
          }}
        />
      </div>

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
                  <Dialog.Title className="text-xl font-semibold text-white mb-4">Добавить смену</Dialog.Title>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="block text-xs mb-1" style={{ color: "rgba(255, 255, 255, 0.7)" }}>Тип</label>
                      <select
                        value={form.type}
                        onChange={(e) => applyTypePreset(e.target.value as any)}
                        className="border rounded px-2 py-2 w-full"
                      >
                        <option value="MORNING">День</option>
                        <option value="NIGHT">Ночь</option>
                        <option value="CUSTOM">Другая</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs mb-1" style={{ color: "rgba(255, 255, 255, 0.7)" }}>Начало</label>
                      <input type="time" value={form.start} onChange={(e) => setForm((f) => ({ ...f, start: e.target.value }))} className="border rounded px-2 py-2 w-full" />
                    </div>
                    <div>
                      <label className="block text-xs mb-1" style={{ color: "rgba(255, 255, 255, 0.7)" }}>Окончание</label>
                      <input type="time" value={form.end} onChange={(e) => setForm((f) => ({ ...f, end: e.target.value }))} className="border rounded px-2 py-2 w-full" />
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
                        <div className="text-sm text-gray-300">{new Date(selectedShift.startTime).toLocaleString()} — {new Date(selectedShift.endTime).toLocaleString()}</div>
                        <div className="flex gap-2">
                          <button className="btn-ghost" onClick={async () => { await fetch(`/api/shifts/${selectedShift.id}`, { method: 'DELETE' }); setDetailOpen(false); mutate(); }}>Удалить смену</button>
                          <button className="btn-ghost" onClick={async () => { const status = prompt('Статус: ATTENDED/ABSENT/LATE', 'ATTENDED'); if(!status) return; await fetch(`/api/shifts/${selectedShift.id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ status }) }); mutate(); }}>Изменить статус</button>
                        </div>
                      </div>
                      {isDirector && (
                        <div className="space-y-6">
                          <div>
                            <div className="font-semibold mb-2 text-white">Штрафы</div>
                            <div className="grid grid-cols-3 items-center gap-2">
                              <input id="p-amount" placeholder="Сумма" type="number" className="border rounded px-2 py-2 w-full" />
                              <input id="p-reason" placeholder="Причина" className="border rounded px-2 py-2 w-full" />
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
                              <input id="b-amount" placeholder="Сумма" type="number" className="border rounded px-2 py-2 w-full" />
                              <input id="b-reason" placeholder="Причина" className="border rounded px-2 py-2 w-full" />
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
                              <input id="h-qty" placeholder="Кол-во" type="number" className="border rounded px-2 py-2 w-full" />
                              <input id="h-amount" placeholder="₽ за 1 (по умолчанию 200)" type="number" className="border rounded px-2 py-2 w-full" />
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


