import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import z from "zod";

const settingsSchema = z.object({
  botToken: z.string().min(1, "Токен бота обязателен"),
  chatId: z.string().optional().nullable(),
  enabled: z.boolean().optional(),
  topicShift: z.string().optional().nullable(),
  topicHookah: z.string().optional().nullable(),
  topicCorkFee: z.string().optional().nullable(),
  topicPlayStation: z.string().optional().nullable(),
  topicInvoice: z.string().optional().nullable(),
  topicPromotion: z.string().optional().nullable(),
  topicPenalty: z.string().optional().nullable(),
  topicBonus: z.string().optional().nullable(),
  topicPayment: z.string().optional().nullable(),
  topicSchedule: z.string().optional().nullable(),
  topicTables: z.string().optional().nullable(),
  topicDebt: z.string().optional().nullable(),
  topicTasks: z.string().optional().nullable(),
  topicChecklist: z.string().optional().nullable(),
  topicLostItems: z.string().optional().nullable(),
});

export async function GET() {
  try {
    const session = await getAuth();
    if (!session) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const role = (session as any)?.user?.role;
    if (role !== "DIRECTOR") {
      return NextResponse.json({ error: "Доступ запрещен" }, { status: 403 });
    }

    // Получаем настройки или создаем дефолтные
    let settings = await prisma.telegramSettings.findFirst();
    
    if (!settings) {
      settings = await prisma.telegramSettings.create({
        data: {
          botToken: null,
          chatId: null,
          enabled: false,
          topicShift: null,
          topicHookah: null,
          topicCorkFee: null,
          topicPlayStation: null,
          topicInvoice: null,
          topicPromotion: null,
          topicPenalty: null,
          topicBonus: null,
          topicPayment: null,
          topicSchedule: null,
          topicTables: null,
          topicDebt: null,
          topicTasks: null,
          topicChecklist: null,
          topicLostItems: null,
        },
      });
    }

    return NextResponse.json({
      botToken: settings.botToken,
      chatId: settings.chatId,
      enabled: settings.enabled,
      topicShift: settings.topicShift,
      topicHookah: settings.topicHookah,
      topicCorkFee: settings.topicCorkFee,
      topicPlayStation: settings.topicPlayStation,
      topicInvoice: settings.topicInvoice,
      topicPromotion: settings.topicPromotion,
      topicPenalty: settings.topicPenalty,
      topicBonus: settings.topicBonus,
      topicPayment: settings.topicPayment,
      topicSchedule: settings.topicSchedule,
      topicTables: settings.topicTables,
      topicDebt: settings.topicDebt,
      topicTasks: settings.topicTasks,
      topicChecklist: settings.topicChecklist,
      topicLostItems: settings.topicLostItems,
    });
  } catch (error: any) {
    console.error("Error fetching Telegram settings:", error);
    return NextResponse.json(
      { error: "Ошибка получения настроек" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getAuth();
    if (!session) {
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const role = (session as any)?.user?.role;
    if (role !== "DIRECTOR") {
      return NextResponse.json({ error: "Доступ запрещен" }, { status: 403 });
    }

    const body = await req.json();
    const validated = settingsSchema.parse(body);

    // Получаем или создаем настройки
    let settings = await prisma.telegramSettings.findFirst();
    
    if (settings) {
      settings = await prisma.telegramSettings.update({
        where: { id: settings.id },
        data: {
          botToken: validated.botToken,
          chatId: validated.chatId || null,
          enabled: validated.enabled || false,
          topicShift: validated.topicShift || null,
          topicHookah: validated.topicHookah || null,
          topicCorkFee: validated.topicCorkFee || null,
          topicPlayStation: validated.topicPlayStation || null,
          topicInvoice: validated.topicInvoice || null,
          topicPromotion: validated.topicPromotion || null,
          topicPenalty: validated.topicPenalty || null,
          topicBonus: validated.topicBonus || null,
          topicPayment: validated.topicPayment || null,
          topicSchedule: validated.topicSchedule || null,
          topicTables: validated.topicTables || null,
          topicDebt: validated.topicDebt || null,
          topicTasks: validated.topicTasks || null,
          topicChecklist: validated.topicChecklist || null,
          topicLostItems: validated.topicLostItems || null,
        },
      });
    } else {
      settings = await prisma.telegramSettings.create({
        data: {
          botToken: validated.botToken,
          chatId: validated.chatId || null,
          enabled: validated.enabled || false,
          topicShift: validated.topicShift || null,
          topicHookah: validated.topicHookah || null,
          topicCorkFee: validated.topicCorkFee || null,
          topicPlayStation: validated.topicPlayStation || null,
          topicInvoice: validated.topicInvoice || null,
          topicPromotion: validated.topicPromotion || null,
          topicPenalty: validated.topicPenalty || null,
          topicBonus: validated.topicBonus || null,
          topicPayment: validated.topicPayment || null,
          topicSchedule: validated.topicSchedule || null,
          topicTables: validated.topicTables || null,
          topicDebt: validated.topicDebt || null,
          topicTasks: validated.topicTasks || null,
          topicChecklist: validated.topicChecklist || null,
          topicLostItems: validated.topicLostItems || null,
        },
      });
    }

    return NextResponse.json({
      botToken: settings.botToken,
      chatId: settings.chatId,
      enabled: settings.enabled,
      topicShift: settings.topicShift,
      topicHookah: settings.topicHookah,
      topicCorkFee: settings.topicCorkFee,
      topicPlayStation: settings.topicPlayStation,
      topicInvoice: settings.topicInvoice,
      topicPromotion: settings.topicPromotion,
      topicPenalty: settings.topicPenalty,
      topicBonus: settings.topicBonus,
      topicPayment: settings.topicPayment,
      topicSchedule: settings.topicSchedule,
      topicTables: settings.topicTables,
      topicDebt: settings.topicDebt,
      topicTasks: settings.topicTasks,
      topicChecklist: settings.topicChecklist,
      topicLostItems: settings.topicLostItems,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    console.error("Error saving Telegram settings:", error);
    return NextResponse.json(
      { error: "Ошибка сохранения настроек" },
      { status: 500 }
    );
  }
}

