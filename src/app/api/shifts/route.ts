import { prisma } from "@/lib/prisma";
import { requireShiftManager } from "@/lib/guards";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import { notifyShiftCreated } from "@/lib/telegram";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get("employeeId") ?? undefined;
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  const where: any = {};
  if (employeeId) where.employeeId = employeeId;
  if (start && end) where.date = { gte: new Date(start), lte: new Date(end) };
  const shifts = await prisma.shift.findMany({ where, orderBy: { startTime: "asc" }, include: { employee: { select: { id: true, name: true, telegramTag: true } } } });
  return NextResponse.json(shifts);
}

const shiftSchema = z.object({
  employeeId: z.string(),
  date: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  type: z.enum(["MORNING", "EVENING", "NIGHT", "CUSTOM"]).default("CUSTOM"),
});

export async function POST(req: Request) {
  const forbidden = await requireShiftManager();
  if (forbidden) return forbidden;
  
  const session = await getAuth();
  const role = (((session as any)?.user as any)?.role ?? "EMPLOYEE") as string;
  const userName = (((session as any)?.user as any)?.name ?? "Администратор") as string;
  
  const body = await req.json();
  const parsed = shiftSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { employeeId, date, startTime, endTime, type } = parsed.data;
  const start = new Date(startTime);
  const end = new Date(endTime);
  const hours = Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60 * 60));
  const created = await prisma.shift.create({
    data: { employeeId, date: new Date(date), startTime: start, endTime: end, hours, type },
    include: { employee: { select: { id: true, name: true, telegramTag: true } } },
  });
  
  // Отправляем уведомление в Telegram
  try {
    const settings = await prisma.telegramSettings.findFirst();
    if (settings?.enabled && settings?.botToken) {
      const shiftTypeMap: Record<string, string> = {
        MORNING: "День",
        EVENING: "Вечер",
        NIGHT: "Ночь",
        CUSTOM: "Другая",
      };
      
      await notifyShiftCreated({
        botToken: settings.botToken,
        chatId: settings.chatId || undefined,
        adminName: userName,
        employeeName: created.employee?.name || "Сотрудник",
        shiftDate: new Date(date),
        shiftType: shiftTypeMap[type] || type,
        role,
        topicId: settings.topicSchedule || undefined,
        employeeTag: created.employee?.telegramTag,
      });
    }
  } catch (error) {
    console.error("Failed to send Telegram notification:", error);
    // Не прерываем создание смены из-за ошибки уведомления
  }
  
  return NextResponse.json(created, { status: 201 });
}


