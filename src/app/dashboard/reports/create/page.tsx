"use client";
import useSWR from "swr";
import { useMemo, useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useNextIcons } from "@/components/NI";
import { useRouter } from "next/navigation";
import { useSuccess } from "@/components/SuccessProvider";

type Shift = {
  id: string;
  employeeId: string;
  date: string;
  startTime: string;
  endTime: string;
  type: "MORNING" | "EVENING" | "NIGHT" | "CUSTOM";
  employee?: { id: string; name: string };
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

export default function CreateReportPage() {
  const router = useRouter();
  const NI = useNextIcons();
  const { data: session } = useSession();
  const { data: me } = useSWR<any>("/api/me", fetcher);
  const myEmployeeId = me?.employeeId as string | undefined;
  const { data: employees } = useSWR<Employee[]>("/api/employees", fetcher);
  const { data: shifts } = useSWR<Shift[]>("/api/shifts", fetcher);
  const { showSuccess } = useSuccess();
  
  const role = ((session as any)?.user as any)?.role as string | undefined;
  const isEmployee = role === "EMPLOYEE";
  const isAdmin = role === "ADMIN";

  const [employeeId, setEmployeeId] = useState(myEmployeeId || "");
  const [shiftId, setShiftId] = useState("");
  const [type, setType] = useState<Report["type"]>("FINANCIAL");
  const [notes, setNotes] = useState("");
  const [amount, setAmount] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

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

  const employeeOptions = useMemo(() => {
    if ((isEmployee || isAdmin) && employees) {
      return employees.filter((e) => e.id === myEmployeeId);
    }
    return employees ?? [];
  }, [employees, isEmployee, isAdmin, myEmployeeId]);

  const filteredShifts = useMemo(() => {
    if (!employeeId || !shifts) return [];
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    // Показываем смены: вчера, сегодня, завтра
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return shifts.filter(s => {
      const shiftDate = new Date(s.date);
      const shiftDateOnly = new Date(shiftDate.getFullYear(), shiftDate.getMonth(), shiftDate.getDate());
      const shiftTime = shiftDateOnly.getTime();
      return s.employeeId === employeeId && 
             (shiftTime === yesterday.getTime() ||
              shiftTime === today.getTime() ||
              shiftTime === tomorrow.getTime());
    }).sort((a, b) => {
      // Сортируем по дате (новые сначала)
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [employeeId, shifts]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setSelectedFiles(Array.from(e.target.files));
  };

  // Paste images with Ctrl+V
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      if (!e.clipboardData) return;
      
      const items = Array.from(e.clipboardData.items);
      const imageItems = items.filter(item => item.type.indexOf('image') !== -1);
      
      if (imageItems.length > 0) {
        e.preventDefault();
        const files: File[] = [];
        for (const item of imageItems) {
          const blob = item.getAsFile();
          if (blob) {
            // Convert clipboard data to File with a timestamp name
            const file = new File([blob], `pasted-${Date.now()}.${blob.type.split('/')[1] || 'png'}`, { type: blob.type });
            files.push(file);
          }
        }
        setSelectedFiles(prev => [...prev, ...files]);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const pcOptions = [...Array(40).keys()].map(i => `PC${i + 1}`).concat(["PS5"]);

  const save = async () => {
    let data: any = {};
    let calculatedAmount: number | undefined = undefined;

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
      const prices: Record<string, number> = { NORMAL: 100, LIGHT: 250, STRONG: 500 };
      calculatedAmount = (prices[corkCategory] || 0) * (Number(corkQuantity) || 0);
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

    try {
      // Сначала создаем отчет
      const createResponse = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          employeeId: employeeId || "",
          shiftId: shiftId || undefined,
          notes,
          amount: calculatedAmount || (amount ? Number(amount) : undefined),
          files: [],
          data,
        }),
      });

      if (!createResponse.ok) {
        throw new Error("Ошибка при создании отчёта");
      }

      const createdReport = await createResponse.json();
      const reportId = createdReport.id;

      // Если есть файлы, загружаем их
      if (selectedFiles.length > 0) {
        const formData = new FormData();
        formData.append("reportId", reportId);
        selectedFiles.forEach((file) => {
          formData.append("files", file);
        });

        const uploadResponse = await fetch("/api/reports/upload", {
          method: "POST",
          body: formData,
        });

        if (!uploadResponse.ok) {
          throw new Error("Ошибка при загрузке файлов");
        }

        const uploadResult = await uploadResponse.json();
        // Обновляем отчет с путями к файлам
        const updateResponse = await fetch(`/api/reports/${reportId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            files: uploadResult.files,
          }),
        });

        if (!updateResponse.ok) {
          throw new Error("Ошибка при обновлении отчёта с файлами");
        }
      }

      showSuccess("Отчёт успешно создан!");
      setTimeout(() => router.push("/dashboard/reports"), 500);
    } catch (error) {
      console.error("Save error:", error);
      alert("Ошибка при сохранении отчёта");
    }
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Создать отчёт</h1>
        <button className="text-gray-600 hover:text-black" onClick={() => router.back()}>Отмена</button>
      </div>

      <div className="card p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium mb-1">Тип отчёта *</label>
          <select value={type} onChange={(e) => setType(e.target.value as Report["type"])} className="border rounded px-2 py-1 w-full">
            {Object.entries(reportTypeLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        {!isEmployee && !isAdmin && (
          <div>
            <label className="block text-sm font-medium mb-1">Сотрудник *</label>
            <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className="border rounded px-2 py-1 w-full">
              <option value="">Выберите сотрудника</option>
              {employeeOptions.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>
        )}

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
            isAdmin={isAdmin}
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
            isAdmin={isAdmin}
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
          {selectedFiles.length > 0 && (
            <div className="mt-2 space-y-1">
              <div className="text-sm text-white">Выбрано файлов: {selectedFiles.length}</div>
              <div className="flex flex-wrap gap-2">
                {selectedFiles.map((file, idx) => (
                  <div key={idx} className="text-xs text-gray-400 truncate max-w-[200px] border border-gray-700 rounded px-2 py-1">
                    {file.name}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Сумма (если применимо)</label>
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="border rounded px-2 py-1 w-full" placeholder="0" step="0.01" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Заметки</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="border rounded px-2 py-1 w-full" rows={3} placeholder="Дополнительная информация..." />
        </div>

        <div className="flex gap-2 pt-4">
          <button className="btn-primary flex-1" onClick={save}>
            <NI.Save className="w-4 h-4" /> Сохранить
          </button>
          <button className="border px-4 py-2 rounded flex-1" onClick={() => router.back()}>
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
}

// Компоненты полей для каждого типа отчета
function FinancialReportFields(props: any) {
  const {
    shiftPhase, setShiftPhase, admin, setAdmin, nalLangame, setNalLangame, nalFact, setNalFact,
    beznalLangame, setBeznalLangame, beznalFact, setBeznalFact, discrepancy, setDiscrepancy, isAdmin
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
      {!isAdmin && (
        <div>
          <label className="block text-sm font-medium mb-1">Администратор</label>
          <input type="text" value={admin} onChange={(e) => setAdmin(e.target.value)} className="border rounded px-2 py-1 w-full" placeholder="Имя администратора" />
        </div>
      )}
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
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setPcModal(false)}>
            <div className="modal-panel max-w-md max-h-[400px] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold">Выберите ПК/PS5</h3>
                <button onClick={() => setPcModal(false)} className="text-white hover:text-red-500">✕</button>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {pcOptions.map((opt: string) => (
                  <button key={opt} onClick={() => { setPc(opt); setPcModal(false); }} className={`border rounded px-2 py-1 transition-all ${pc === opt ? "bg-gradient-to-r from-red-500 to-red-600 text-white shadow-[0_0_12px_rgba(255,0,0,0.3)]" : "bg-gray-900 text-white border-gray-700 hover:border-red-500/50 hover:bg-red-500/10"}`}>{opt}</button>
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
  const { admin, setAdmin, shiftPhase, setShiftPhase, isAdmin } = props;
  return (
    <>
      {!isAdmin && (
        <div>
          <label className="block text-sm font-medium mb-1">Администратор</label>
          <input type="text" value={admin} onChange={(e) => setAdmin(e.target.value)} className="border rounded px-2 py-1 w-full" placeholder="Имя администратора" />
        </div>
      )}
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
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setPcModal(false)}>
            <div className="modal-panel max-w-md max-h-[400px] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold">Выберите ПК/PS5</h3>
                <button onClick={() => setPcModal(false)} className="text-white hover:text-red-500">✕</button>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {pcOptions.map((opt: string) => (
                  <button key={opt} onClick={() => { setPc(opt); setPcModal(false); }} className={`border rounded px-2 py-1 transition-all ${pc === opt ? "bg-gradient-to-r from-red-500 to-red-600 text-white shadow-[0_0_12px_rgba(255,0,0,0.3)]" : "bg-gray-900 text-white border-gray-700 hover:border-red-500/50 hover:bg-red-500/10"}`}>{opt}</button>
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

