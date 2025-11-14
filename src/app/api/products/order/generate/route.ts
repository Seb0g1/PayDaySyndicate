import { prisma } from "@/lib/prisma";
import { requireDirector } from "@/lib/guards";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const forbidden = await requireDirector();
    if (forbidden) return forbidden;

    // Получаем товары с остатком <= 15 (которых мало, нужно заказать) и информацией о заказе
    // Используем прямой SQL запрос для обхода проблем с отсутствующими колонками
    let products: any[] = [];
    try {
      // Проверяем, существует ли таблица ProductOrder
      const orderInfoTableExists = await prisma.$queryRaw`
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'ProductOrder' 
        LIMIT 1;
      ` as any[];
      
      if (orderInfoTableExists && orderInfoTableExists.length > 0) {
        // Если таблица существует, используем JOIN с фильтром
        products = await prisma.$queryRaw`
          SELECT 
            p.id,
            p.name,
            p.stock,
            oi."officialName",
            oi."quantityPerBox"
          FROM "Product" p
          INNER JOIN "ProductOrder" oi ON oi."productId" = p.id
          WHERE p.stock < 10
            AND p."isHidden" = false
            AND oi."officialName" IS NOT NULL
            AND oi."quantityPerBox" IS NOT NULL
          ORDER BY p.stock ASC, p.name ASC
        ` as any[];
      } else {
        // Если таблицы нет, возвращаем пустой массив
        return NextResponse.json({
          items: [],
          text: "",
        });
      }
    } catch (dbError: any) {
      console.error("Error fetching products:", dbError);
      // Возвращаем пустой результат вместо ошибки
      return NextResponse.json({
        items: [],
        text: "",
      });
    }

    // Получаем список исключенных ID товаров из LangameSettings
    let filteredProducts = products;
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
          // Получаем langameId для каждого продукта
          const productIds = products.map((p: any) => p.id);
          if (productIds.length > 0) {
            const productsWithLangame = await prisma.$queryRaw`
              SELECT id, "langameId" FROM "Product" WHERE id = ANY(${productIds}::TEXT[])
            ` as any[];
            
            const langameMap = new Map(productsWithLangame.map((p: any) => [p.id, p.langameId]));
            filteredProducts = products.filter((p: any) => {
              const langameId = langameMap.get(p.id);
              return !langameId || !langameSettings.excludedProductIds.includes(langameId);
            });
          }
        }
      }
    } catch (error) {
      // Игнорируем ошибки при получении настроек
      console.warn("Error checking LangameSettings:", error);
    }

    // Формируем список товаров для заказа
    // quantityPerBox теперь означает "сколько упаковок заказать" (введенное пользователем значение)
    const orderList = (filteredProducts || [])
      .filter((p: any) => p.officialName && p.quantityPerBox)
      .map((p: any) => {
        const currentStock = Number(p.stock) || 0;
        const boxes = Number(p.quantityPerBox) || 0; // Используем значение, введенное пользователем
        
        return {
          productId: p.id,
          productName: p.name,
          officialName: p.officialName,
          quantityPerBox: boxes, // Количество упаковок для заказа
          currentStock: currentStock,
          needed: 0, // Не используется больше
          shortage: 0, // Не используется больше
          boxes: boxes,
          orderText: `${p.officialName} — ${boxes} уп.`,
        };
      })
      .filter((item: any) => item.boxes > 0); // Только товары, которые нужно заказать

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

