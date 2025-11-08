import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/guards";

export async function POST(req: Request) {
  const forbidden = await requireAdmin();
  if (forbidden) return forbidden;
  
  try {
    const body = await req.json();
    const { ids, category } = body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "ids[] required and must not be empty" }, { status: 400 });
    }
    
    // Обрабатываем category правильно - может быть null, undefined или строкой
    const updateData: any = {};
    if (category !== undefined) {
      updateData.category = category || null;
    } else {
      // Если category не передан, не обновляем его
      return NextResponse.json({ error: "category is required" }, { status: 400 });
    }
    
    console.log(`[API /products/bulk-subcategory] Updating ${ids.length} products with category: ${category}`);
    
    const res = await prisma.product.updateMany({ 
      where: { id: { in: ids as string[] } }, 
      data: updateData
    });
    
    console.log(`[API /products/bulk-subcategory] Updated ${res.count} products`);
    
    return NextResponse.json({ updated: res.count });
  } catch (error: any) {
    console.error("[API /products/bulk-subcategory] Error:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка при обновлении подкатегории" },
      { status: 500 }
    );
  }
}


