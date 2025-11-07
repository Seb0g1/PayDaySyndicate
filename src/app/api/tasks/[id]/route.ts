import { prisma } from "@/lib/prisma";
import { getAuth } from "@/lib/auth";
import { requireDirector } from "@/lib/guards";
import { NextResponse } from "next/server";
import { z } from "zod";

const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  dueDate: z.string().optional().nullable(),
});

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getAuth();
  const userId = (((session as any)?.user as any)?.id ?? "") as string;
  const role = (((session as any)?.user as any)?.role ?? "EMPLOYEE") as string;

  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      assignedTo: { select: { id: true, name: true, telegramTag: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });

  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  // Проверяем права доступа
  if (role !== "DIRECTOR") {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user?.employeeId !== task.assignedToId) {
      return new NextResponse("Forbidden", { status: 403 });
    }
  }

  return NextResponse.json(task);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getAuth();
  const userId = (((session as any)?.user as any)?.id ?? "") as string;
  const role = (((session as any)?.user as any)?.role ?? "EMPLOYEE") as string;

  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  // Проверяем права доступа
  if (role !== "DIRECTOR") {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user?.employeeId !== task.assignedToId) {
      return new NextResponse("Forbidden", { status: 403 });
    }
  }

  const body = await req.json();
  const parsed = updateTaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updateData: any = {};
  if (parsed.data.title !== undefined) updateData.title = parsed.data.title;
  if (parsed.data.description !== undefined) updateData.description = parsed.data.description || null;
  if (parsed.data.status !== undefined) {
    updateData.status = parsed.data.status;
    if (parsed.data.status === "COMPLETED") {
      updateData.completedAt = new Date();
    } else if (parsed.data.status !== "COMPLETED" && task.completedAt) {
      updateData.completedAt = null;
    }
  }
  if (parsed.data.priority !== undefined) updateData.priority = parsed.data.priority;
  if (parsed.data.dueDate !== undefined) {
    updateData.dueDate = parsed.data.dueDate ? new Date(parsed.data.dueDate) : null;
  }

  const updated = await prisma.task.update({
    where: { id },
    data: updateData,
    include: {
      assignedTo: { select: { id: true, name: true, telegramTag: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const forbidden = await requireDirector();
  if (forbidden) return forbidden;

  const { id } = await params;
  await prisma.task.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
