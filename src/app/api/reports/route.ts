import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/guards";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import { 
  notifyCorkFeeReport, 
  notifyFinancialReport, 
  notifyHookahReport,
  notifyTableStatusReport,
  notifyPromotionReport,
  notifyPlayStationReport,
  notifyVatInvoiceReport,
  getTopicIdForReportType 
} from "@/lib/telegram";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get("employeeId") ?? undefined;
  const type = searchParams.get("type") ?? undefined;
  const shiftId = searchParams.get("shiftId") ?? undefined;
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  
  const where: any = {};
  if (employeeId) where.employeeId = employeeId;
  if (type) where.type = type;
  if (shiftId) where.shiftId = shiftId;
  if (start && end) {
    where.createdAt = { gte: new Date(start), lte: new Date(end) };
  }
  
  const reports = await prisma.report.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      employee: { select: { id: true, name: true, email: true, telegramTag: true } },
      shift: { select: { id: true, date: true } },
    },
  });
  return NextResponse.json(reports);
}

const reportSchema = z.object({
  type: z.enum(["FINANCIAL", "HOOKAH", "CORK_FEE", "TABLE_STATUS", "PROMOTION", "PLAYSTATION", "VAT_INVOICE"]),
  employeeId: z.string(),
  shiftId: z.string().optional(),
  data: z.any().optional(),
  files: z.array(z.string()).default([]),
  notes: z.string().optional(),
  amount: z.number().optional(),
});

export async function POST(req: Request) {
  // Убираем проверку прав - сотрудники могут добавлять свои отчеты
  // const forbidden = await requireAdmin();
  // if (forbidden) return forbidden;
  
  const session = await getAuth();
  const userName = (((session as any)?.user as any)?.name ?? "Администратор") as string;
  
  const body = await req.json();
  const parsed = reportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  
  const { type, employeeId, shiftId, data, files, notes, amount } = parsed.data;
  
  // Если это отчет о кальяне и есть привязка к смене, создаем ShiftHookah
  if (type === "HOOKAH" && shiftId) {
    try {
      await prisma.shiftHookah.create({
        data: { shiftId, qty: 1, amountPer: 200 },
      });
    } catch (e) {
      // Игнорируем ошибку, если уже существует
    }
  }
  
  const created = await prisma.report.create({
    data: {
      type,
      employeeId,
      shiftId,
      data,
      files,
      notes,
      amount: amount ? amount : undefined,
    },
    include: {
      employee: { select: { id: true, name: true, email: true, telegramTag: true } },
      shift: { select: { id: true, date: true } },
    },
  });
  
  // Отправляем уведомление в Telegram
  try {
    const settings = await prisma.telegramSettings.findFirst();
    if (settings?.enabled && settings?.botToken) {
      const reportTypeLabels: Record<string, string> = {
        FINANCIAL: "Финансовый отчет",
        HOOKAH: "Отчет о кальянах",
        TABLE_STATUS: "Отчет о состоянии столов",
        PROMOTION: "Учет акций",
        PLAYSTATION: "Учет PlayStation",
        VAT_INVOICE: "Накладная",
        CORK_FEE: "Отчет о пробковом сборе",
      };
      
      const topicId = getTopicIdForReportType(type, settings);
      
      // НЕ отправляем уведомления при создании отчёта, т.к. файлы ещё не загружены
      // Уведомления отправится при загрузке файлов в PATCH /api/reports/[id]
      // Это предотвращает дублирование сообщений
    }
  } catch (error) {
    console.error("Failed to send Telegram notification:", error);
    // Не прерываем создание отчета из-за ошибки уведомления
  }
  
  return NextResponse.json(created, { status: 201 });
}

