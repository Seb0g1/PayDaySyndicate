import { prisma } from "@/lib/prisma";
import { getAuth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { writeFile } from "fs/promises";
import { join } from "path";
import { mkdir } from "fs/promises";
import { notifyLostItem } from "@/lib/telegram";

const lostItemSchema = z.object({
  pcNumber: z.string().optional(),
  guestPhone: z.string().optional(),
  guestName: z.string().optional(),
  location: z.string().optional(),
  photos: z.array(z.string()).optional().default([]),
});

export async function GET(req: Request) {
  const session = await getAuth();
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const where: any = {};
  if (status) {
    where.status = status;
  }

  const items = await prisma.lostItem.findMany({
    where,
    include: {
      createdBy: { select: { id: true, name: true } },
      retrievedBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const session = await getAuth();
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const userId = (((session as any)?.user as any)?.id ?? "") as string;
  const userName = (((session as any)?.user as any)?.name ?? "Администратор") as string;
  const role = (((session as any)?.user as any)?.role ?? "EMPLOYEE") as string;

  // Только ADMIN и выше могут создавать забытые вещи
  if (role === "EMPLOYEE") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const formData = await req.formData();
  const pcNumber = formData.get("pcNumber") as string | null;
  const guestPhone = formData.get("guestPhone") as string | null;
  const guestName = formData.get("guestName") as string | null;
  const location = formData.get("location") as string | null;

  const files = formData.getAll("photos") as File[];
  const imagePaths: string[] = [];

  // Сохраняем изображения
  if (files.length > 0) {
    const itemId = `lost_${Date.now()}`;
    const uploadDir = join(process.cwd(), "public", "uploads", "lost-items", itemId);
    await mkdir(uploadDir, { recursive: true });

    for (const file of files) {
      if (file.size > 0) {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const fileName = `${Date.now()}_${file.name}`;
        const filePath = join(uploadDir, fileName);
        await writeFile(filePath, buffer);
        imagePaths.push(`/uploads/lost-items/${itemId}/${fileName}`);
      }
    }
  }

  // Получаем telegram tag пользователя
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { employee: { select: { telegramTag: true } } },
  });

  const item = await prisma.lostItem.create({
    data: {
      pcNumber: pcNumber || null,
      guestPhone: guestPhone || null,
      guestName: guestName || null,
      location: location || null,
      photos: imagePaths,
      status: "LOST",
      createdById: userId,
    },
    include: {
      createdBy: { select: { id: true, name: true } },
    },
  });

  // Отправляем уведомление в Telegram
  let telegramMessageId: number | null = null;
  try {
    const settings = await prisma.telegramSettings.findFirst();
    if (settings?.enabled && settings?.botToken) {
      telegramMessageId = await notifyLostItem({
        botToken: settings.botToken,
        chatId: settings.chatId || undefined,
        adminName: userName,
        telegramTag: user?.employee?.telegramTag || undefined,
        pcNumber: pcNumber || undefined,
        guestPhone: guestPhone || undefined,
        guestName: guestName || undefined,
        photos: imagePaths,
        topicId: settings.topicLostItems || undefined,
      });

      // Сохраняем message_id если получили
      if (telegramMessageId) {
        await prisma.lostItem.update({
          where: { id: item.id },
          data: { telegramMessageId: String(telegramMessageId) },
        });
      }
    }
  } catch (error) {
    console.error("Failed to send Telegram notification:", error);
  }

  return NextResponse.json(item, { status: 201 });
}

