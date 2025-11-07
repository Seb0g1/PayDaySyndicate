import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/guards";
import { z } from "zod";

const schema = z.object({
  ids: z.array(z.string()),
  price: z.number().min(0),
});

export async function POST(req: Request) {
  const forbidden = await requireAdmin();
  if (forbidden) return forbidden;

  try {
    const body = await req.json();
    const { ids, price } = schema.parse(body);

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "ids[] required and must not be empty" },
        { status: 400 }
      );
    }

    if (price < 0) {
      return NextResponse.json(
        { error: "price must be >= 0" },
        { status: 400 }
      );
    }

    const result = await prisma.product.updateMany({
      where: {
        id: { in: ids },
      },
      data: {
        price: price,
      },
    });

    return NextResponse.json({
      success: true,
      updated: result.count,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error updating prices:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка при обновлении цен" },
      { status: 500 }
    );
  }
}

