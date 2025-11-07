import { prisma } from "@/lib/prisma";
import { requireDirector } from "@/lib/guards";
import { NextResponse } from "next/server";
import { z } from "zod";

const orderSchema = z.object({
  officialName: z.string().optional(),
  quantityPerBox: z.number().int().positive().optional(),
});

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const forbidden = await requireDirector();
    if (forbidden) return forbidden;

    const { id } = await params;
    
    const orderInfo = await prisma.productOrder.findUnique({
      where: { productId: id },
      include: { product: true },
    });

    if (!orderInfo) {
      return NextResponse.json(null);
    }

    return NextResponse.json(orderInfo);
  } catch (error: any) {
    console.error("Error fetching product order info:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка получения данных о заказе" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const forbidden = await requireDirector();
    if (forbidden) return forbidden;

    const { id } = await params;
    const body = await req.json();
    const parsed = orderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    // Проверяем, существует ли товар
    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      return NextResponse.json({ error: "Товар не найден" }, { status: 404 });
    }

    // Обновляем или создаем запись о заказе
    const orderInfo = await prisma.productOrder.upsert({
      where: { productId: id },
      create: {
        productId: id,
        officialName: parsed.data.officialName || null,
        quantityPerBox: parsed.data.quantityPerBox || null,
      },
      update: {
        officialName: parsed.data.officialName !== undefined ? parsed.data.officialName : undefined,
        quantityPerBox: parsed.data.quantityPerBox !== undefined ? parsed.data.quantityPerBox : undefined,
      },
    });

    return NextResponse.json(orderInfo);
  } catch (error: any) {
    console.error("Error updating product order info:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка обновления данных о заказе" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const forbidden = await requireDirector();
    if (forbidden) return forbidden;

    const { id } = await params;

    await prisma.productOrder.delete({
      where: { productId: id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting product order info:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка удаления данных о заказе" },
      { status: 500 }
    );
  }
}

