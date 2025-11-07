import { prisma } from "@/lib/prisma";
import { getAuth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
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

const reportUpdateSchema = z.object({
  type: z.enum(["FINANCIAL", "HOOKAH", "CORK_FEE", "TABLE_STATUS", "PROMOTION", "PLAYSTATION", "VAT_INVOICE"]).optional(),
  shiftId: z.string().optional(),
  data: z.any().optional(),
  files: z.array(z.string()).optional(),
  notes: z.string().optional(),
  amount: z.number().optional(),
  reason: z.string().optional(), // Причина изменения (для администраторов)
});

async function getRoleAndName(): Promise<{ role: string; name: string } | null> {
  const session = await getAuth();
  const role = ((session as any)?.user as any)?.role;
  const name = ((session as any)?.user as any)?.name || "Неизвестный";
  return role ? { role, name } : null;
}

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const report = await prisma.report.findUnique({
    where: { id },
    include: {
      employee: { select: { id: true, name: true, email: true } },
      shift: { select: { id: true, date: true } },
    },
  });
  if (!report) return new NextResponse("Not found", { status: 404 });
  return NextResponse.json(report);
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getRoleAndName();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  
  const { id } = await ctx.params;
  const body = await req.json();
  const parsed = reportUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  
  // Получаем старые данные отчета
  const oldReport = await prisma.report.findUnique({ where: { id } });
  if (!oldReport) return new NextResponse("Not found", { status: 404 });
  
  // Если пользователь не директор и пытается редактировать не свой отчет
  if (user.role !== "DIRECTOR" && oldReport.employeeId !== ((await getAuth()) as any)?.user?.employeeId) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  
  const updated = await prisma.report.update({
    where: { id },
    data: parsed.data,
    include: {
      employee: { select: { id: true, name: true, email: true, telegramTag: true } },
      shift: { select: { id: true, date: true } },
    },
  });
  
  // Создаем запись в логе изменений
  try {
    await prisma.reportAuditLog.create({
      data: {
        reportId: id,
        changedBy: user.name,
        userRole: user.role,
        reason: parsed.data.reason || null,
        oldData: {
          id: oldReport.id,
          type: oldReport.type,
          data: oldReport.data,
          files: oldReport.files,
          notes: oldReport.notes,
          amount: oldReport.amount,
          shiftId: oldReport.shiftId,
        } as any,
        newData: {
          id: updated.id,
          type: updated.type,
          data: updated.data,
          files: updated.files,
          notes: updated.notes,
          amount: updated.amount,
          shiftId: updated.shiftId,
        } as any,
      },
    });
  } catch (logError) {
    console.error("Failed to create audit log:", logError);
    // Не прерываем выполнение, если лог не создался
  }

  // Если файлы были добавлены, отправляем уведомление в Telegram
  // Проверяем, что файлы действительно были добавлены (не было файлов раньше)
  if (parsed.data.files && parsed.data.files.length > 0 && (!oldReport.files || oldReport.files.length === 0)) {
    try {
      const settings = await prisma.telegramSettings.findFirst();
      if (settings?.enabled && settings?.botToken) {
        const topicId = getTopicIdForReportType(updated.type, settings);
        const reportData = updated.data as any || {};
        
        // Формируем пути к фотографиям
        const photoUrls = parsed.data.files.map((file: string) => `/uploads/${updated.id}/${file}`);
        
        if (updated.type === "FINANCIAL") {
          const nalLangame = reportData.nalLangame;
          const nalFact = reportData.nalFact;
          const discrepancy = reportData.discrepancy;
          const shiftPhase = reportData.shiftPhase;
          const shiftDate = updated.shift?.date ? new Date(updated.shift.date) : undefined;
          
          await notifyFinancialReport({
            botToken: settings.botToken,
            chatId: settings.chatId || undefined,
            adminName: user.name,
            telegramTag: updated.employee?.telegramTag,
            shiftDate,
            shiftPhase,
            nalLangame,
            nalFact,
            discrepancy,
            topicId,
            photoUrls,
          });
        } else if (updated.type === "CORK_FEE") {
          const amountValue = updated.amount || reportData.amount;
          const category = reportData.category;
          const pcNumber = reportData.pc;
          
          await notifyCorkFeeReport({
            botToken: settings.botToken,
            chatId: settings.chatId || undefined,
            adminName: user.name,
            topicId,
            amount: amountValue,
            category,
            pcNumber,
            telegramTag: updated.employee?.telegramTag,
            photoUrls,
          });
        } else if (updated.type === "HOOKAH") {
          const shiftDate = updated.shift?.date ? new Date(updated.shift.date) : undefined;
          
          await notifyHookahReport({
            botToken: settings.botToken,
            chatId: settings.chatId || undefined,
            adminName: user.name,
            telegramTag: updated.employee?.telegramTag,
            shiftDate,
            topicId,
            photoUrls,
          });
        } else if (updated.type === "TABLE_STATUS") {
          const shiftDate = updated.shift?.date ? new Date(updated.shift.date) : undefined;
          
          await notifyTableStatusReport({
            botToken: settings.botToken,
            chatId: settings.chatId || undefined,
            adminName: user.name,
            telegramTag: updated.employee?.telegramTag,
            shiftDate,
            topicId,
            photoUrls,
          });
        } else if (updated.type === "PROMOTION") {
          await notifyPromotionReport({
            botToken: settings.botToken,
            chatId: settings.chatId || undefined,
            adminName: user.name,
            telegramTag: updated.employee?.telegramTag,
            reportDate: reportData.date,
            phone: reportData.phone,
            clientName: reportData.clientName,
            promoType: reportData.promoType,
            topicId,
            photoUrls,
          });
        } else if (updated.type === "PLAYSTATION") {
          const shiftDate = updated.shift?.date ? new Date(updated.shift.date) : undefined;
          
          await notifyPlayStationReport({
            botToken: settings.botToken,
            chatId: settings.chatId || undefined,
            adminName: user.name,
            telegramTag: updated.employee?.telegramTag,
            shiftDate,
            time: reportData.time,
            topicId,
            photoUrls,
          });
        } else if (updated.type === "VAT_INVOICE") {
          await notifyVatInvoiceReport({
            botToken: settings.botToken,
            chatId: settings.chatId || undefined,
            adminName: user.name,
            telegramTag: updated.employee?.telegramTag,
            invoiceDate: reportData.date,
            month: reportData.month,
            description: reportData.description,
            topicId,
            photoUrls,
          });
        }
      }
    } catch (telegramError) {
      console.error("Failed to send Telegram notification with photos:", telegramError);
      // Не прерываем выполнение из-за ошибки уведомления
    }
  }
  
  return NextResponse.json(updated);
}

export async function DELETE(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getRoleAndName();
  if (!user || user.role !== "DIRECTOR") {
    return new NextResponse("Forbidden", { status: 403 });
  }
  
  const { id } = await ctx.params;
  await prisma.report.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}

