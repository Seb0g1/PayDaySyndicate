import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/guards";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1).optional(),
  price: z.number().positive().optional(),
  category: z.string().nullable().optional(), // подкатегория (тег)
  subcategory: z.string().nullable().optional(), // подкатегория
  stock: z.number().int().nonnegative().optional(),
  categoryId: z.string().nullable().optional(), // основная категория
  isHidden: z.boolean().optional(), // скрыть товар
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const forbidden = await requireAdmin();
  if (forbidden) return forbidden;
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { id } = await ctx.params;
  
  // Обрабатываем null значения правильно
  const updateData: any = {};
  if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
  if (parsed.data.price !== undefined) updateData.price = parsed.data.price;
  if (parsed.data.category !== undefined) updateData.category = parsed.data.category;
  if (parsed.data.subcategory !== undefined) updateData.subcategory = parsed.data.subcategory;
  if (parsed.data.stock !== undefined) updateData.stock = parsed.data.stock;
  // Обрабатываем categoryId правильно - может быть null для удаления категории
  if (parsed.data.categoryId !== undefined) {
    updateData.categoryId = parsed.data.categoryId || null;
  }
  if (parsed.data.isHidden !== undefined) updateData.isHidden = parsed.data.isHidden;
  
  console.log(`[API /products/[id]] Updating product ${id} with data:`, updateData);
  
  const updated = await prisma.product.update({ where: { id }, data: updateData });
  
  console.log(`[API /products/[id]] Product ${id} updated successfully`);
  
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


