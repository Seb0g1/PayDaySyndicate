import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
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
    const topicId = body.topicId;

    const settings = await prisma.telegramSettings.findFirst();
    
    if (!settings || !settings.botToken) {
      return NextResponse.json(
        { error: "Токен бота не настроен" },
        { status: 400 }
      );
    }

    // Импортируем telegramService динамически
    const { sendTelegramMessage } = await import("@/lib/telegram");
    
    const sent = await sendTelegramMessage({
      message: "✅ Тестовое сообщение от бота PayDay Syndicate",
      botToken: settings.botToken,
      chatId: settings.chatId || undefined,
      topicId: topicId,
    });

    if (!sent) {
      return NextResponse.json(
        { error: "Не удалось отправить сообщение" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error sending test message:", error);
    return NextResponse.json(
      { error: "Ошибка отправки тестового сообщения" },
      { status: 500 }
    );
  }
}

