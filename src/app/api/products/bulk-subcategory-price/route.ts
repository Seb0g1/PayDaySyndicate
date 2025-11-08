import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/guards";
import { z } from "zod";

const schema = z.object({
  ids: z.array(z.string()),
  category: z.string().optional().nullable(), // подкатегория (тег)
  subcategory: z.string().optional().nullable(), // подкатегория
  price: z.number().min(0).optional(),
});

export async function POST(req: Request) {
  const forbidden = await requireAdmin();
  if (forbidden) return forbidden;

  try {
    const body = await req.json();
    const { ids, category, subcategory, price } = schema.parse(body);

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "ids[] required and must not be empty" },
        { status: 400 }
      );
    }

    const updateData: any = {};
    
    if (category !== undefined) {
      updateData.category = category || null;
    }
    
    if (subcategory !== undefined) {
      updateData.subcategory = subcategory || null;
    }
    
    if (price !== undefined && price !== null) {
      if (price < 0) {
        return NextResponse.json(
          { error: "price must be >= 0" },
          { status: 400 }
        );
      }
      updateData.price = price;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "At least one of category, subcategory or price must be provided" },
        { status: 400 }
      );
    }

    const result = await prisma.product.updateMany({
      where: {
        id: { in: ids },
      },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      updated: result.count,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error updating subcategory and price:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка при обновлении подкатегории и цены" },
      { status: 500 }
    );
  }
}

