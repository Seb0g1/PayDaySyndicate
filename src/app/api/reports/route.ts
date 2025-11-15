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
      const topicId = getTopicIdForReportType(type, settings);
      const reportData = data as any || {};
      
      // Формируем пути к фотографиям (если файлы уже есть)
      const photoUrls = files && files.length > 0 
        ? files.map((file: string) => `/uploads/${created.id}/${file}`)
        : [];
      
      // Для TABLE_STATUS проверяем также photoCategories в data
      const hasPhotoCategories = type === "TABLE_STATUS" && reportData.photoCategories && 
        Object.keys(reportData.photoCategories).length > 0;
      
      // Отправляем уведомление всегда для всех типов отчетов
      // Для TABLE_STATUS - если есть photoCategories или файлы
      // Для остальных - всегда (даже без файлов, так как данные важны)
      const shouldNotifyNow = type === "TABLE_STATUS" 
        ? (hasPhotoCategories || (files && files.length > 0))
        : true; // Все остальные типы отправляем всегда
      
      if (shouldNotifyNow) {
        if (type === "FINANCIAL") {
          const nalLangame = reportData.nalLangame;
          const nalFact = reportData.nalFact;
          const discrepancy = reportData.discrepancy;
          const shiftPhase = reportData.shiftPhase;
          const shiftDate = created.shift?.date ? new Date(created.shift.date) : undefined;
          
          await notifyFinancialReport({
            botToken: settings.botToken,
            chatId: settings.chatId || undefined,
            adminName: userName,
            telegramTag: created.employee?.telegramTag || undefined,
            shiftDate,
            shiftPhase,
            nalLangame,
            nalFact,
            discrepancy,
            topicId,
            photoUrls,
          });
        } else if (type === "CORK_FEE") {
          const amountValue = amount || reportData.amount;
          const category = reportData.category;
          const pcNumber = reportData.pc;
          
          await notifyCorkFeeReport({
            botToken: settings.botToken,
            chatId: settings.chatId || undefined,
            adminName: userName,
            topicId,
            amount: amountValue,
            category,
            pcNumber,
            telegramTag: created.employee?.telegramTag || undefined,
            photoUrls,
          });
        } else if (type === "HOOKAH") {
          const shiftDate = created.shift?.date ? new Date(created.shift.date) : undefined;
          
          await notifyHookahReport({
            botToken: settings.botToken,
            chatId: settings.chatId || undefined,
            adminName: userName,
            telegramTag: created.employee?.telegramTag || undefined,
            shiftDate,
            topicId,
            photoUrls,
          });
        } else if (type === "TABLE_STATUS") {
          const shiftDate = created.shift?.date ? new Date(created.shift.date) : undefined;
          const photoCategories = reportData.photoCategories || {};
          
          const photoCategoriesWithPaths: Record<string, string[]> = {};
          for (const [cat, files] of Object.entries(photoCategories)) {
            if (Array.isArray(files)) {
              photoCategoriesWithPaths[cat] = files.map((file: string) => {
                return `/uploads/${created.id}/${file}`;
              });
            }
          }
          
          await notifyTableStatusReport({
            botToken: settings.botToken,
            chatId: settings.chatId || undefined,
            adminName: userName,
            telegramTag: created.employee?.telegramTag || undefined,
            shiftDate,
            topicId,
            photoCategories: photoCategoriesWithPaths,
          });
        } else if (type === "PROMOTION") {
          await notifyPromotionReport({
            botToken: settings.botToken,
            chatId: settings.chatId || undefined,
            adminName: userName,
            telegramTag: created.employee?.telegramTag || undefined,
            reportDate: reportData.date,
            phone: reportData.phone,
            clientName: reportData.clientName,
            promoType: reportData.promoType,
            topicId,
            photoUrls,
          });
        } else if (type === "PLAYSTATION") {
          const shiftDate = created.shift?.date ? new Date(created.shift.date) : undefined;
          
          await notifyPlayStationReport({
            botToken: settings.botToken,
            chatId: settings.chatId || undefined,
            adminName: userName,
            telegramTag: created.employee?.telegramTag || undefined,
            shiftDate,
            time: reportData.time,
            topicId,
            photoUrls,
          });
        } else if (type === "VAT_INVOICE") {
          await notifyVatInvoiceReport({
            botToken: settings.botToken,
            chatId: settings.chatId || undefined,
            adminName: userName,
            telegramTag: created.employee?.telegramTag || undefined,
            invoiceDate: reportData.date,
            month: reportData.month,
            description: reportData.description,
            topicId,
            photoUrls,
          });
        }
      }
    }
  } catch (error) {
    console.error("Failed to send Telegram notification:", error);
    // Не прерываем создание отчета из-за ошибки уведомления
  }
  
  return NextResponse.json(created, { status: 201 });
}

