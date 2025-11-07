import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/guards";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1).optional(),
  price: z.number().positive().optional(),
  category: z.string().optional(), // подкатегория (тег)
  subcategory: z.string().optional(), // подкатегория
  stock: z.number().int().nonnegative().optional(),
  categoryId: z.string().optional(), // основная категория
  isHidden: z.boolean().optional(), // скрыть товар
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const forbidden = await requireAdmin();
  if (forbidden) return forbidden;
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { id } = await ctx.params;
  const updated = await prisma.product.update({ where: { id }, data: parsed.data });
  return NextResponse.json(updated);
}

export async function DELETE(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const forbidden = await requireAdmin();
  if (forbidden) return forbidden;
  const { id } = await ctx.params;
  
  // Скрываем товар вместо удаления (soft delete)
  try {
    await prisma.product.update({
      where: { id },
      data: { isHidden: true },
    });
    return new NextResponse(null, { status: 204 });
  } catch (e: any) {
    return NextResponse.json({ message: "Не удалось скрыть товар" }, { status: 500 });
  }
}


