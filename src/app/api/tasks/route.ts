import { prisma } from "@/lib/prisma";
import { getAuth } from "@/lib/auth";
import { requireDirector } from "@/lib/guards";
import { NextResponse } from "next/server";
import { z } from "zod";
import { notifyTask } from "@/lib/telegram";
import { createNotificationForEmployee } from "@/lib/notifications";

const taskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  assignedToId: z.string(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  dueDate: z.string().optional(),
});

export async function GET(req: Request) {
  const session = await getAuth();
  const role = (((session as any)?.user as any)?.role ?? "EMPLOYEE") as string;
  const userId = (((session as any)?.user as any)?.id ?? "") as string;

  const { searchParams } = new URL(req.url);
  const assignedToId = searchParams.get("assignedToId");
  const status = searchParams.get("status");

  const where: any = {};

  // Если это директор, он видит все задачи
  if (role === "DIRECTOR") {
    if (assignedToId) where.assignedToId = assignedToId;
    if (status) where.status = status;
  } else {
    // Для остальных - только их задачи
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.employeeId) {
      return new NextResponse("Forbidden", { status: 403 });
    }
    where.assignedToId = user.employeeId;
    if (status) where.status = status;
  }

  const tasks = await prisma.task.findMany({
    where,
    include: {
      assignedTo: { select: { id: true, name: true, telegramTag: true } },
      createdBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(tasks);
}

export async function POST(req: Request) {
  const forbidden = await requireDirector();
  if (forbidden) return forbidden;

  const session = await getAuth();
  const userId = (((session as any)?.user as any)?.id ?? "") as string;
  const userName = (((session as any)?.user as any)?.name ?? "Директор") as string;

  const body = await req.json();
  const parsed = taskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { title, description, assignedToId, priority, dueDate } = parsed.data;

  // Проверяем, что сотрудник существует
  const employee = await prisma.employee.findUnique({
    where: { id: assignedToId },
    select: { id: true, name: true, telegramTag: true },
  });

  if (!employee) {
    return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  }

  const task = await prisma.task.create({
    data: {
      title,
      description: description || null,
      assignedToId,
      createdById: userId,
      priority,
      dueDate: dueDate ? new Date(dueDate) : null,
    },
    include: {
      assignedTo: { select: { id: true, name: true, telegramTag: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });

  // Отправляем уведомление в Telegram
  try {
    const settings = await prisma.telegramSettings.findFirst();
    if (settings?.enabled && settings?.botToken) {
      await notifyTask({
        botToken: settings.botToken,
        chatId: settings.chatId || undefined,
        adminName: userName,
        employeeName: employee.name,
        employeeTag: employee.telegramTag || undefined,
        taskTitle: title,
        taskDescription: description || "",
        priority,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        topicId: settings.topicTasks || undefined,
      });
    }

    // Создаем уведомление для сотрудника
    await createNotificationForEmployee(assignedToId, {
      type: "task",
      title: "Новая задача назначена",
      message: `${userName} назначил вам задачу: ${title}${description ? `\n${description}` : ""}`,
      link: `/dashboard/tasks`,
    });
  } catch (error) {
    console.error("Failed to send Telegram notification:", error);
  }

  return NextResponse.json(task, { status: 201 });
}

