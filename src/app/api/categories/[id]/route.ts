import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/guards";
import { z } from "zod";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const forbidden = await requireAdmin();
  if (forbidden) return forbidden;
  const { id } = await ctx.params;
  const body = await req.json();
  const parsed = z.object({ name: z.string().min(1).optional(), parentId: z.string().nullable().optional() }).safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const data: any = parsed.data;
  const c = await prisma.category.update({ where: { id }, data });
  return NextResponse.json(c);
}

export async function DELETE(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const forbidden = await requireAdmin();
  if (forbidden) return forbidden;
  const { id } = await ctx.params;
  // Отвязываем товары, чтобы удаление прошло без конфликтов
  await prisma.product.updateMany({ where: { categoryId: id }, data: { categoryId: null } });
  await prisma.category.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}


