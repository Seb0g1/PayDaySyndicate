import { prisma } from "@/lib/prisma";
import { getAuth } from "@/lib/auth";
import { requireDirector } from "@/lib/guards";
import { NextResponse } from "next/server";
import { z } from "zod";

const settingsSchema = z.object({
  apiKey: z.string().min(1),
  clubId: z.string().min(1),
  enabled: z.boolean().optional(),
  baseUrl: z.string().optional(),
  excludedProductIds: z.array(z.number()).optional(),
});

export async function GET() {
  try {
    const forbidden = await requireDirector();
    if (forbidden) return forbidden;

    try {
      const settings = await prisma.langameSettings.findFirst();
      
      if (!settings) {
        return NextResponse.json({
          apiKey: null,
          clubId: null,
          enabled: false,
          baseUrl: "https://api.langame.ru",
          excludedProductIds: [],
        });
      }

      return NextResponse.json({
        apiKey: settings.apiKey,
        clubId: settings.clubId,
        enabled: settings.enabled,
        baseUrl: settings.baseUrl || "https://api.langame.ru",
        excludedProductIds: settings.excludedProductIds || [],
      });
    } catch (error: any) {
      // Если таблица не существует, возвращаем дефолтные значения
      if (error.code === 'P2021' || error.message?.includes('does not exist') || error.message?.includes('LangameSettings')) {
        return NextResponse.json({
          apiKey: null,
          clubId: null,
          enabled: false,
          baseUrl: "https://api.langame.ru",
          excludedProductIds: [],
        });
      }
      throw error;
    }
  } catch (error: any) {
    console.error("Error fetching Langame settings:", error);
    return NextResponse.json(
      { error: "Ошибка получения настроек Langame. Возможно, требуется выполнить миграцию базы данных." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const forbidden = await requireDirector();
    if (forbidden) return forbidden;

    const body = await req.json();
    const parsed = settingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    try {
      let settings = await prisma.langameSettings.findFirst();

      if (settings) {
        settings = await prisma.langameSettings.update({
          where: { id: settings.id },
          data: {
            apiKey: parsed.data.apiKey,
            clubId: parsed.data.clubId,
            enabled: parsed.data.enabled ?? settings.enabled,
            baseUrl: parsed.data.baseUrl || "https://api.langame.ru",
            excludedProductIds: parsed.data.excludedProductIds ?? settings.excludedProductIds,
          },
        });
      } else {
        settings = await prisma.langameSettings.create({
          data: {
            apiKey: parsed.data.apiKey,
            clubId: parsed.data.clubId,
            enabled: parsed.data.enabled ?? false,
            baseUrl: parsed.data.baseUrl || "https://api.langame.ru",
            excludedProductIds: parsed.data.excludedProductIds || [],
          },
        });
      }

      return NextResponse.json({
        apiKey: settings.apiKey,
        clubId: settings.clubId,
        enabled: settings.enabled,
        baseUrl: settings.baseUrl || "https://api.langame.ru",
        excludedProductIds: settings.excludedProductIds || [],
      });
    } catch (error: any) {
      // Если таблица не существует, сообщаем об ошибке
      if (error.code === 'P2021' || error.message?.includes('does not exist') || error.message?.includes('LangameSettings')) {
        return NextResponse.json(
          { error: "Таблица LangameSettings не существует. Необходимо выполнить миграцию базы данных: npx prisma migrate dev" },
          { status: 500 }
        );
      }
      throw error;
    }
  } catch (error: any) {
    console.error("Error saving Langame settings:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка сохранения настроек Langame" },
      { status: 500 }
    );
  }
}

