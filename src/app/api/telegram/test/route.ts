import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    console.log("[API /telegram/test] Starting test message request");
    const session = await getAuth();
    if (!session) {
      console.error("[API /telegram/test] No session found");
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const role = (session as any)?.user?.role;
    if (role !== "DIRECTOR") {
      console.error("[API /telegram/test] Access denied for role:", role);
      return NextResponse.json({ error: "Доступ запрещен" }, { status: 403 });
    }

    const body = await req.json();
    const topicId = body.topicId;
    console.log("[API /telegram/test] Request body:", { topicId });

    const settings = await prisma.telegramSettings.findFirst();
    console.log("[API /telegram/test] Settings found:", { 
      hasSettings: !!settings, 
      hasBotToken: !!settings?.botToken,
      hasChatId: !!settings?.chatId 
    });
    
    if (!settings || !settings.botToken) {
      console.error("[API /telegram/test] Bot token not configured");
      return NextResponse.json(
        { error: "Токен бота не настроен" },
        { status: 400 }
      );
    }

    // Импортируем telegramService динамически
    const { sendTelegramMessage } = await import("@/lib/telegram");
    
    console.log("[API /telegram/test] Sending message with:", {
      botToken: settings.botToken ? "***" : "missing",
      chatId: settings.chatId || "undefined",
      topicId: topicId || "undefined"
    });
    
    const sent = await sendTelegramMessage({
      message: "✅ Тестовое сообщение от бота PayDay Syndicate",
      botToken: settings.botToken,
      chatId: settings.chatId || undefined,
      topicId: topicId,
    });

    console.log("[API /telegram/test] Message sent result:", sent);

    if (!sent) {
      console.error("[API /telegram/test] Failed to send message");
      return NextResponse.json(
        { error: "Не удалось отправить сообщение. Проверьте настройки бота и chatId." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[API /telegram/test] Error:", error);
    console.error("[API /telegram/test] Error stack:", error.stack);
    return NextResponse.json(
      { error: error.message || "Ошибка отправки тестового сообщения" },
      { status: 500 }
    );
  }
}

