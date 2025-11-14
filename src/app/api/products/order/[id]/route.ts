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
    console.log("[API /products/order/[id]] Starting PATCH request");
    
    const forbidden = await requireDirector();
    if (forbidden) {
      console.log("[API /products/order/[id]] Access forbidden");
      return forbidden;
    }

    const { id } = await params;
    console.log("[API /products/order/[id]] Product ID:", id);

    let body: any;
    try {
      body = await req.json();
      console.log("[API /products/order/[id]] Request body:", body);
    } catch (parseError: any) {
      console.error("[API /products/order/[id]] Error parsing JSON:", parseError);
      return NextResponse.json(
        { error: "Ошибка парсинга JSON тела запроса" },
        { status: 400 }
      );
    }

    // Обрабатываем пустые строки как null
    if (body.officialName === "") {
      body.officialName = null;
    }
    if (body.quantityPerBox === "" || body.quantityPerBox === null) {
      body.quantityPerBox = null;
    }

    const parsed = orderSchema.safeParse(body);

    if (!parsed.success) {
      console.error("[API /products/order/[id]] Validation error:", parsed.error.flatten());
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    console.log("[API /products/order/[id]] Parsed data:", parsed.data);

    // Проверяем, существует ли товар
    let product;
    try {
      product = await prisma.product.findUnique({
        where: { id },
      });
      console.log("[API /products/order/[id]] Product found:", !!product);
    } catch (dbError: any) {
      console.error("[API /products/order/[id]] Error finding product:", dbError);
      console.error("[API /products/order/[id]] Error code:", dbError.code);
      console.error("[API /products/order/[id]] Error message:", dbError.message);
      return NextResponse.json(
        { error: `Ошибка базы данных при поиске товара: ${dbError.message}` },
        { status: 500 }
      );
    }

    if (!product) {
      console.error("[API /products/order/[id]] Product not found");
      return NextResponse.json({ error: "Товар не найден" }, { status: 404 });
    }

    // Подготавливаем данные для upsert
    const createData: any = {
      productId: id,
      officialName: parsed.data.officialName || null,
      quantityPerBox: parsed.data.quantityPerBox || null,
    };

    const updateData: any = {};
    if (parsed.data.officialName !== undefined) {
      updateData.officialName = parsed.data.officialName || null;
    }
    if (parsed.data.quantityPerBox !== undefined) {
      updateData.quantityPerBox = parsed.data.quantityPerBox || null;
    }

    console.log("[API /products/order/[id]] Create data:", createData);
    console.log("[API /products/order/[id]] Update data:", updateData);

    // Обновляем или создаем запись о заказе
    let orderInfo;
    try {
      orderInfo = await prisma.productOrder.upsert({
        where: { productId: id },
        create: createData,
        update: updateData,
      });
      console.log("[API /products/order/[id]] Order info upserted successfully");
    } catch (upsertError: any) {
      console.error("[API /products/order/[id]] Error upserting order info:", upsertError);
      console.error("[API /products/order/[id]] Error code:", upsertError.code);
      console.error("[API /products/order/[id]] Error message:", upsertError.message);
      console.error("[API /products/order/[id]] Error meta:", upsertError.meta);
      console.error("[API /products/order/[id]] Error stack:", upsertError.stack);
      
      // Проверяем, существует ли таблица ProductOrder
      try {
        const tableExists = await prisma.$queryRaw`
          SELECT 1 FROM information_schema.tables 
          WHERE table_name = 'ProductOrder' 
          LIMIT 1;
        ` as any[];
        console.log("[API /products/order/[id]] ProductOrder table exists:", tableExists && tableExists.length > 0);
      } catch (checkError: any) {
        console.error("[API /products/order/[id]] Error checking table existence:", checkError);
      }
      
      return NextResponse.json(
        { 
          error: `Ошибка обновления данных о заказе: ${upsertError.message || "Неизвестная ошибка"}`,
          code: upsertError.code,
          details: upsertError.meta
        },
        { status: 500 }
      );
    }

    return NextResponse.json(orderInfo);
  } catch (error: any) {
    console.error("[API /products/order/[id]] Unexpected error:", error);
    console.error("[API /products/order/[id]] Error name:", error?.name);
    console.error("[API /products/order/[id]] Error message:", error?.message);
    console.error("[API /products/order/[id]] Error stack:", error?.stack);
    return NextResponse.json(
      { error: error?.message || "Неожиданная ошибка при обновлении данных о заказе" },
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

