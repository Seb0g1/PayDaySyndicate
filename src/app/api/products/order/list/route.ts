import { prisma } from "@/lib/prisma";
import { requireDirector } from "@/lib/guards";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const forbidden = await requireDirector();
    if (forbidden) return forbidden;

    // Получаем товары с остатком <= 15 (которых мало, нужно заказать)
    const products = await prisma.product.findMany({
      where: {
        stock: { lte: 15 },
        isHidden: false,
      },
      include: {
        categoryRef: true,
        orderInfo: true,
      },
      orderBy: [
        { stock: "asc" }, // Сначала товары с наименьшим остатком
        { name: "asc" },
      ],
    });

    // Получаем список исключенных ID товаров из LangameSettings
    try {
      // Проверяем, существует ли таблица LangameSettings
      const tableExists = await prisma.$queryRaw`
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'LangameSettings' 
        LIMIT 1;
      ` as any[];
      
      if (tableExists && tableExists.length > 0) {
        const langameSettings = await prisma.langameSettings.findFirst();
        if (langameSettings?.excludedProductIds && langameSettings.excludedProductIds.length > 0) {
          return NextResponse.json(
            products.filter((p) => !p.langameId || !langameSettings.excludedProductIds.includes(p.langameId))
          );
        }
      }
    } catch (error) {
      // Игнорируем ошибки при получении настроек
      console.warn("Error checking LangameSettings:", error);
    }

    return NextResponse.json(products);
  } catch (error: any) {
    console.error("Error fetching products for order:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка получения списка товаров" },
      { status: 500 }
    );
  }
}

