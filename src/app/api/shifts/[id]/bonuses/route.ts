import { prisma } from "@/lib/prisma";
import { requireDirector } from "@/lib/guards";
import { getAuth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { notifyBonus } from "@/lib/telegram";
import { createNotificationForEmployee } from "@/lib/notifications";

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const items = await prisma.shiftBonus.findMany({ where: { shiftId: id }, orderBy: { createdAt: "desc" } });
  return NextResponse.json(items);
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const forbidden = await requireDirector();
  if (forbidden) return forbidden;
  const { id } = await ctx.params;
  const body = await req.json();
  const parsed = z.object({ amount: z.number().positive(), reason: z.string().min(1) }).safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  
  const created = await prisma.shiftBonus.create({ 
    data: { shiftId: id, amount: parsed.data.amount, reason: parsed.data.reason },
    include: {
      shift: {
        include: {
          employee: { select: { id: true, name: true, telegramTag: true } }
        }
      }
    }
  });
  
  // Отправляем уведомление в Telegram
  try {
    const settings = await prisma.telegramSettings.findFirst();
    if (settings?.enabled && settings?.botToken) {
      const session = await getAuth();
      const userName = (((session as any)?.user as any)?.name ?? "Администратор") as string;
      await notifyBonus({
        botToken: settings.botToken,
        chatId: settings.chatId || undefined,
        adminName: userName,
        employeeName: created.shift.employee.name,
        shiftDate: created.shift.date,
        amount: Number(parsed.data.amount),
        reason: parsed.data.reason,
        topicId: settings.topicBonus || undefined,
      });
    }

    // Создаем уведомление для сотрудника
    await createNotificationForEmployee(created.shift.employeeId, {
      type: "bonus",
      title: "Новый бонус",
      message: `Вам начислен бонус ${Number(parsed.data.amount).toFixed(2)} ₽. Причина: ${parsed.data.reason}`,
      link: `/dashboard/shifts`,
    });
  } catch (telegramError) {
    console.error("Failed to send Telegram notification:", telegramError);
    // Не прерываем выполнение из-за ошибки уведомления
  }
  
  return NextResponse.json(created, { status: 201 });
}


