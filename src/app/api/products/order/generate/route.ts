import { prisma } from "@/lib/prisma";
import { requireDirector } from "@/lib/guards";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const forbidden = await requireDirector();
    if (forbidden) return forbidden;

    // Получаем товары с остатком <= 15 (которых мало, нужно заказать) и информацией о заказе
    const products = await prisma.product.findMany({
      where: {
        stock: { lte: 15 },
        isHidden: false,
        orderInfo: {
          officialName: { not: null },
          quantityPerBox: { not: null },
        },
      },
      include: {
        orderInfo: true,
      },
      orderBy: [
        { stock: "asc" }, // Сначала товары с наименьшим остатком
        { name: "asc" },
      ],
    });

    // Получаем список исключенных ID товаров из LangameSettings
    let filteredProducts = products;
    try {
      const langameSettings = await prisma.langameSettings.findFirst();
      if (langameSettings?.excludedProductIds && langameSettings.excludedProductIds.length > 0) {
        filteredProducts = products.filter(
          (p) => !p.langameId || !langameSettings.excludedProductIds.includes(p.langameId)
        );
      }
    } catch (error) {
      // Игнорируем ошибки при получении настроек
    }

    // Формируем список товаров для заказа
    // Для товаров с остатком <= 15 заказываем минимум 1 уп.
    const orderList = filteredProducts
      .filter((p) => p.orderInfo && p.orderInfo.officialName && p.orderInfo.quantityPerBox)
      .map((p) => {
        const orderInfo = p.orderInfo!;
        const needed = 20; // Минимальный остаток для заказа (можно настроить)
        const currentStock = p.stock;
        const shortage = Math.max(0, needed - currentStock);
        // Если остаток меньше нужного, заказываем минимум 1 уп.
        // Если остаток уже больше нужного, не заказываем
        const boxes = currentStock >= needed ? 0 : Math.max(1, Math.ceil(shortage / orderInfo.quantityPerBox!));
        
        return {
          productId: p.id,
          productName: p.name,
          officialName: orderInfo.officialName,
          quantityPerBox: orderInfo.quantityPerBox,
          currentStock: currentStock,
          needed: needed,
          shortage: shortage,
          boxes: boxes,
          orderText: `${orderInfo.officialName} — ${boxes} уп.`,
        };
      })
      .filter((item) => item.boxes > 0); // Только товары, которые нужно заказать

    return NextResponse.json({
      items: orderList,
      text: orderList.map((item) => item.orderText).join("\n"),
    });
  } catch (error: any) {
    console.error("Error generating order list:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка формирования списка заказа" },
      { status: 500 }
    );
  }
}

