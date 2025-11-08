import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/guards";
import { NextResponse } from "next/server";
import { z } from "zod";

const permissionSchema = z.object({
  permission: z.string().min(1),
  granted: z.boolean(),
});

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const permissions = await (prisma as any).employeePermission.findMany({
    where: { employeeId: id },
    orderBy: { permission: "asc" },
  });
  return NextResponse.json(permissions);
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const forbidden = await requireAdmin();
  if (forbidden) return forbidden;
  
  const { id } = await ctx.params;
  const body = await req.json();
  const parsed = permissionSchema.safeParse(body);
  
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  
  // Проверяем, существует ли сотрудник
  const employee = await prisma.employee.findUnique({ where: { id } });
  if (!employee) {
    return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  }
  
  // Создаем или обновляем право
  const permission = await (prisma as any).employeePermission.upsert({
    where: {
      employeeId_permission: {
        employeeId: id,
        permission: parsed.data.permission,
      },
    },
    update: {
      granted: parsed.data.granted,
    },
    create: {
      employeeId: id,
      permission: parsed.data.permission,
      granted: parsed.data.granted,
    },
  });
  
  return NextResponse.json(permission);
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const forbidden = await requireAdmin();
  if (forbidden) return forbidden;
  
  const { id } = await ctx.params;
  const { searchParams } = new URL(req.url);
  const permission = searchParams.get("permission");
  
  if (!permission) {
    return NextResponse.json({ error: "Permission is required" }, { status: 400 });
  }
  
  await (prisma as any).employeePermission.deleteMany({
    where: {
      employeeId: id,
      permission,
    },
  });
  
  return NextResponse.json({ success: true });
}

