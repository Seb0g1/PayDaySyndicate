"use client";
import useSWR from "swr";
import { useState } from "react";
import { useNextIcons } from "@/components/NI";

type Payment = {
  id: string;
  amount: string;
  periodStart: string;
  periodEnd: string;
  status: string;
  pdfFile?: string | null;
  notes?: string | null;
  employee: { id: string; name: string };
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function PaymentsPage() {
  const NI = useNextIcons();
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  
  const { data: payments, mutate } = useSWR<Payment[]>(
    `/api/salary-payments${periodStart && periodEnd ? `?periodStart=${periodStart}&periodEnd=${periodEnd}` : ""}`,
    fetcher
  );
  
  return (
    <div className="space-y-4">
      <div className="card p-3 sm:p-4">
        <h1 className="text-xl font-bold text-white mb-4">История выплат</h1>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2 mb-4">
          <div className="flex-1">
            <label className="block text-xs mb-1 text-gray-400">Период начала</label>
            <input
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              className="border rounded px-2 py-1 bg-gray-900 text-white border-gray-700 w-full"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs mb-1 text-gray-400">Период конца</label>
            <input
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
              className="border rounded px-2 py-1 bg-gray-900 text-white border-gray-700 w-full"
            />
          </div>
          <button
            onClick={() => mutate()}
            className="btn-primary"
          >
            {NI ? <NI.Refresh className="w-4 h-4 inline mr-1" /> : "↻"} Обновить
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="hidden sm:table-header-group">
              <tr className="text-left border-b" style={{ borderColor: "rgba(255, 0, 0, 0.2)" }}>
                <th className="p-3 text-white font-semibold">Сотрудник</th>
                <th className="p-3 text-white font-semibold">Период</th>
                <th className="p-3 text-white font-semibold">Сумма</th>
                <th className="p-3 text-white font-semibold">Статус</th>
                <th className="p-3 text-white font-semibold">PDF</th>
                <th className="p-3 text-white font-semibold">Заметки</th>
              </tr>
            </thead>
            <tbody>
              {(payments ?? []).length === 0 && (
                <tr>
                  <td className="p-3 text-gray-400" colSpan={6}>Нет выплат за выбранный период</td>
                </tr>
              )}
              {(payments ?? []).map((payment) => (
                <>
                <tr key={payment.id} className="border-b hidden sm:table-row" style={{ borderColor: "rgba(255, 255, 255, 0.1)" }}>
                  <td className="p-3 text-white">{payment.employee.name}</td>
                  <td className="p-3 text-gray-300">
                    {new Date(payment.periodStart).toLocaleDateString("ru-RU")} — {new Date(payment.periodEnd).toLocaleDateString("ru-RU")}
                  </td>
                  <td className="p-3 text-white font-medium">{Number(payment.amount).toFixed(2)} ₽</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs ${
                      payment.status === "PAID" ? "bg-green-500/20 text-green-400" :
                      payment.status === "CANCELLED" ? "bg-red-500/20 text-red-400" :
                      "bg-yellow-500/20 text-yellow-400"
                    }`}>
                      {payment.status === "PAID" ? "Выплачено" : payment.status === "CANCELLED" ? "Отменено" : "В процессе"}
                    </span>
                  </td>
                  <td className="p-3">
                    {payment.pdfFile ? (
                      <a
                        href={payment.pdfFile}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-red-500 hover:text-red-400"
                      >
                        {NI ? <NI.FileText className="w-4 h-4" /> : "📄"} Просмотр
                      </a>
                    ) : (
                      <span className="text-gray-500 text-xs">Нет</span>
                    )}
                  </td>
                  <td className="p-3 text-gray-300 text-xs">{payment.notes || "—"}</td>
                </tr>
                {/* Mobile view */}
                <tr key={`${payment.id}-mobile`} className="border-b sm:hidden" style={{ borderColor: "rgba(255, 255, 255, 0.1)" }}>
                  <td className="p-3" colSpan={6}>
                    <div className="space-y-2">
                      <div className="font-medium text-white text-base">{payment.employee.name}</div>
                      <div className="space-y-1 text-xs text-gray-400">
                        <div>📅 {new Date(payment.periodStart).toLocaleDateString("ru-RU")} — {new Date(payment.periodEnd).toLocaleDateString("ru-RU")}</div>
                        <div>💰 {Number(payment.amount).toFixed(2)} ₽</div>
                        {payment.notes && <div>📝 {payment.notes}</div>}
                      </div>
                      <div className="flex items-center gap-3 pt-2 border-t" style={{ borderColor: "rgba(255, 255, 255, 0.1)" }}>
                        <span className={`px-2 py-1 rounded text-xs ${
                          payment.status === "PAID" ? "bg-green-500/20 text-green-400" :
                          payment.status === "CANCELLED" ? "bg-red-500/20 text-red-400" :
                          "bg-yellow-500/20 text-yellow-400"
                        }`}>
                          {payment.status === "PAID" ? "Выплачено" : payment.status === "CANCELLED" ? "Отменено" : "В процессе"}
                        </span>
                        {payment.pdfFile && (
                          <a
                            href={payment.pdfFile}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-red-500 hover:text-red-400 text-xs"
                          >
                            {NI ? <NI.FileText className="w-4 h-4 inline mr-1" /> : "📄"} PDF
                          </a>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

