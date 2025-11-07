import { prisma } from "@/lib/prisma";
import { getAuth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { notifyLostItemRetrieved } from "@/lib/telegram";
import { join } from "path";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getAuth();
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const item = await prisma.lostItem.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, name: true } },
      retrievedBy: { select: { id: true, name: true } },
    },
  });

  if (!item) {
    return NextResponse.json({ error: "Lost item not found" }, { status: 404 });
  }

  return NextResponse.json(item);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getAuth();
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const userId = (((session as any)?.user as any)?.id ?? "") as string;
  const userName = (((session as any)?.user as any)?.name ?? "Администратор") as string;
  const role = (((session as any)?.user as any)?.role ?? "EMPLOYEE") as string;

  // Только ADMIN и выше могут обновлять забытые вещи
  if (role === "EMPLOYEE") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const body = await req.json();
  const { status } = body;

  const item = await prisma.lostItem.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, name: true } },
    },
  });

  if (!item) {
    return NextResponse.json({ error: "Lost item not found" }, { status: 404 });
  }

  // Если статус меняется на RETRIEVED
  if (status === "RETRIEVED" && item.status === "LOST") {
    // Получаем telegram tag пользователя
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { employee: { select: { telegramTag: true } } },
    });

    // Отправляем уведомление в Telegram
    try {
      const settings = await prisma.telegramSettings.findFirst();
      if (settings?.enabled && settings?.botToken && settings.chatId) {
        const originalMessageId = item.telegramMessageId 
          ? (typeof item.telegramMessageId === 'string' 
              ? parseInt(item.telegramMessageId) 
              : item.telegramMessageId)
          : undefined;
        
        await notifyLostItemRetrieved({
          botToken: settings.botToken,
          chatId: settings.chatId,
          adminName: userName,
          telegramTag: user?.employee?.telegramTag || undefined,
          originalMessageId,
          topicId: settings.topicLostItems || undefined,
        });
      }
    } catch (error) {
      console.error("Failed to send Telegram notification:", error);
    }

    // Обновляем статус
    const updated = await prisma.lostItem.update({
      where: { id },
      data: {
        status: "RETRIEVED",
        retrievedById: userId,
        retrievedAt: new Date(),
      },
      include: {
        createdBy: { select: { id: true, name: true } },
        retrievedBy: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(updated);
  }

  // Для других обновлений
  const updated = await prisma.lostItem.update({
    where: { id },
    data: body,
    include: {
      createdBy: { select: { id: true, name: true } },
      retrievedBy: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAuth();
  const role = (((session as any)?.user as any)?.role ?? "EMPLOYEE") as string;

  if (role !== "DIRECTOR") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { id } = await params;
  const item = await prisma.lostItem.findUnique({ where: { id } });

  if (item) {
    // Удаляем изображения
    const { unlink } = await import("fs/promises");
    const { existsSync } = await import("fs");
    for (const photoPath of item.photos) {
      const filePath = join(process.cwd(), "public", photoPath);
      if (existsSync(filePath)) {
        try {
          await unlink(filePath);
        } catch (error) {
          console.error("Error deleting image:", error);
        }
      }
    }
  }

  await prisma.lostItem.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

