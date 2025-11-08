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
  
  try {
    const body = await req.json();
    console.log(`[API /products/[id]] Received update request:`, body);
    
    // Обрабатываем пустые строки как null для categoryId
    if (body.categoryId === "") {
      body.categoryId = null;
    }
    
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      console.error(`[API /products/[id]] Validation error:`, parsed.error.flatten());
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    
    const { id } = await ctx.params;
    
    // Обрабатываем null значения правильно
    const updateData: any = {};
    if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
    if (parsed.data.price !== undefined) updateData.price = parsed.data.price;
    if (parsed.data.category !== undefined) updateData.category = parsed.data.category || null;
    if (parsed.data.subcategory !== undefined) updateData.subcategory = parsed.data.subcategory || null;
    if (parsed.data.stock !== undefined) updateData.stock = parsed.data.stock;
    // Обрабатываем categoryId правильно - может быть null для удаления категории
    if (parsed.data.categoryId !== undefined) {
      // Пустая строка или null должны стать null
      updateData.categoryId = parsed.data.categoryId && parsed.data.categoryId.trim() !== "" ? parsed.data.categoryId : null;
    }
    if (parsed.data.isHidden !== undefined) updateData.isHidden = parsed.data.isHidden;
    
    console.log(`[API /products/[id]] Updating product ${id} with data:`, updateData);
    
    const updated = await prisma.product.update({ where: { id }, data: updateData });
    
    console.log(`[API /products/[id]] Product ${id} updated successfully, categoryId: ${updated.categoryId}`);
    
    return NextResponse.json(updated);
  } catch (error: any) {
    console.error(`[API /products/[id]] Error updating product:`, error);
    return NextResponse.json(
      { error: error.message || "Ошибка при обновлении товара" },
      { status: 500 }
    );
  }
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


