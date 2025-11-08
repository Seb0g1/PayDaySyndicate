import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/guards";

export async function POST(req: Request) {
  const forbidden = await requireAdmin();
  if (forbidden) return forbidden;
  
  try {
    const body = await req.json();
    console.log(`[API /products/bulk-category] Received request:`, body);
    
    let { ids, categoryId } = body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "ids[] required and must not be empty" }, { status: 400 });
    }
    
    // Обрабатываем пустую строку как null для categoryId
    if (categoryId === "") {
      categoryId = null;
    }
    
    // Обрабатываем categoryId правильно - может быть null, undefined или строкой
    const updateData: any = {};
    if (categoryId !== undefined) {
      // Пустая строка или null должны стать null
      updateData.categoryId = categoryId && categoryId.trim() !== "" ? categoryId : null;
    } else {
      // Если categoryId не передан, не обновляем его
      return NextResponse.json({ error: "categoryId is required" }, { status: 400 });
    }
    
    console.log(`[API /products/bulk-category] Updating ${ids.length} products with categoryId: ${updateData.categoryId}`);
    
    const res = await prisma.product.updateMany({ 
      where: { id: { in: ids as string[] } }, 
      data: updateData
    });
    
    console.log(`[API /products/bulk-category] Updated ${res.count} products successfully`);
    
    return NextResponse.json({ updated: res.count });
  } catch (error: any) {
    console.error("[API /products/bulk-category] Error:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка при обновлении категории" },
      { status: 500 }
    );
  }
}

