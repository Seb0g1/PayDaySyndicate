import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    console.log("[API /telegram/test] Starting test message request");
    
    // Проверка авторизации
    let session;
    try {
      session = await getAuth();
    } catch (authError: any) {
      console.error("[API /telegram/test] Auth error:", authError);
      return NextResponse.json({ error: "Ошибка авторизации" }, { status: 401 });
    }
    
    if (!session) {
      console.error("[API /telegram/test] No session found");
      return NextResponse.json({ error: "Не авторизован" }, { status: 401 });
    }

    const role = (session as any)?.user?.role;
    if (role !== "DIRECTOR") {
      console.error("[API /telegram/test] Access denied for role:", role);
      return NextResponse.json({ error: "Доступ запрещен" }, { status: 403 });
    }

    // Парсинг тела запроса
    let body: any = {};
    let topicId: string | undefined;
    try {
      body = await req.json();
      topicId = body?.topicId;
      console.log("[API /telegram/test] Request body parsed:", { hasTopicId: !!topicId });
    } catch (parseError: any) {
      console.error("[API /telegram/test] JSON parse error:", parseError);
      // Если body пустое, это не критично
      topicId = undefined;
    }

    // Получение настроек из базы данных
    let settings;
    try {
      settings = await prisma.telegramSettings.findFirst();
      console.log("[API /telegram/test] Settings found:", { 
        hasSettings: !!settings, 
        hasBotToken: !!settings?.botToken,
        hasChatId: !!settings?.chatId 
      });
    } catch (dbError: any) {
      console.error("[API /telegram/test] Database error:", dbError);
      console.error("[API /telegram/test] Database error code:", dbError.code);
      console.error("[API /telegram/test] Database error message:", dbError.message);
      return NextResponse.json(
        { error: `Ошибка базы данных: ${dbError.message || "Не удалось получить настройки"}` },
        { status: 500 }
      );
    }
    
    if (!settings || !settings.botToken) {
      console.error("[API /telegram/test] Bot token not configured");
      return NextResponse.json(
        { error: "Токен бота не настроен. Пожалуйста, настройте бота в разделе Telegram." },
        { status: 400 }
      );
    }

    if (!settings.chatId) {
      console.error("[API /telegram/test] Chat ID not configured");
      return NextResponse.json(
        { error: "Chat ID не настроен. Пожалуйста, укажите Chat ID в настройках Telegram." },
        { status: 400 }
      );
    }

    // Импорт функции отправки сообщения
    let sendTelegramMessage;
    try {
      const telegramModule = await import("@/lib/telegram");
      sendTelegramMessage = telegramModule.sendTelegramMessage;
      if (!sendTelegramMessage) {
        throw new Error("Функция sendTelegramMessage не найдена в модуле");
      }
      console.log("[API /telegram/test] Telegram module imported successfully");
    } catch (importError: any) {
      console.error("[API /telegram/test] Import error:", importError);
      return NextResponse.json(
        { error: `Ошибка импорта модуля Telegram: ${importError.message}` },
        { status: 500 }
      );
    }
    
    console.log("[API /telegram/test] Sending message with:", {
      botToken: settings.botToken ? "***" : "missing",
      chatId: settings.chatId || "undefined",
      topicId: topicId || "undefined"
    });
    
    // Отправка сообщения
    let sent;
    try {
      sent = await sendTelegramMessage({
        message: "✅ Тестовое сообщение от бота PayDay Syndicate",
        botToken: settings.botToken,
        chatId: settings.chatId || undefined,
        topicId: topicId,
      });
      console.log("[API /telegram/test] Message sent result:", sent);
    } catch (sendError: any) {
      console.error("[API /telegram/test] Send message error:", sendError);
      console.error("[API /telegram/test] Send error stack:", sendError.stack);
      return NextResponse.json(
        { error: `Ошибка отправки сообщения: ${sendError.message || "Неизвестная ошибка"}` },
        { status: 500 }
      );
    }

    if (!sent) {
      console.error("[API /telegram/test] Failed to send message (returned null)");
      return NextResponse.json(
        { error: "Не удалось отправить сообщение. Проверьте настройки бота, chatId и токен. Убедитесь, что бот добавлен в группу и имеет права на отправку сообщений." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, messageId: sent });
  } catch (error: any) {
    console.error("[API /telegram/test] Unexpected error:", error);
    console.error("[API /telegram/test] Error name:", error?.name);
    console.error("[API /telegram/test] Error message:", error?.message);
    console.error("[API /telegram/test] Error stack:", error?.stack);
    return NextResponse.json(
      { error: error?.message || "Неожиданная ошибка при отправке тестового сообщения" },
      { status: 500 }
    );
  }
}

