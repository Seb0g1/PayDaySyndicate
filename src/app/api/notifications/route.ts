import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await getAuth();
    const userId = ((session as any)?.user as any)?.id;
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 50;

    const notifications = await prisma.notification.findMany({
      where: {
        userId,
        ...(unreadOnly ? { read: false } : {}),
      },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
    });

    return NextResponse.json(notifications);
  } catch (error: any) {
    console.error("GET notifications error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getAuth();
    const userId = ((session as any)?.user as any)?.id;
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { notificationIds, markAllAsRead } = body;

    if (markAllAsRead) {
      // Помечаем все уведомления пользователя как прочитанные
      await prisma.notification.updateMany({
        where: {
          userId,
          read: false,
        },
        data: {
          read: true,
          readAt: new Date(),
        },
      });
      return NextResponse.json({ success: true });
    }

    if (notificationIds && Array.isArray(notificationIds)) {
      // Помечаем конкретные уведомления как прочитанные
      await prisma.notification.updateMany({
        where: {
          id: { in: notificationIds },
          userId, // Проверяем, что уведомления принадлежат пользователю
        },
        data: {
          read: true,
          readAt: new Date(),
        },
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  } catch (error: any) {
    console.error("POST notifications error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

