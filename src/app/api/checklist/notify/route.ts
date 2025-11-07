import { prisma } from "@/lib/prisma";
import { getAuth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { notifyChecklist } from "@/lib/telegram";

export async function POST(req: Request) {
  try {
    const session = await getAuth();
    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const userId = (((session as any)?.user as any)?.id ?? "") as string;
    const adminName = ((session as any)?.user as any)?.name || "Администратор";

    // Получаем данные пользователя и сотрудника
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { employee: { select: { telegramTag: true } } },
    });

    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    // Отправляем уведомление в Telegram
    const settings = await prisma.telegramSettings.findFirst();
    if (settings?.enabled && settings?.botToken) {
      await notifyChecklist({
        botToken: settings.botToken,
        chatId: settings.chatId || undefined,
        adminName,
        telegramTag: user.employee?.telegramTag || undefined,
        topicId: settings.topicChecklist || undefined,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error sending checklist notification:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

