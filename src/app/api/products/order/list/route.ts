import { prisma } from "@/lib/prisma";
import { requireDirector } from "@/lib/guards";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const forbidden = await requireDirector();
    if (forbidden) return forbidden;

    // Получаем товары с остатком <= 15 (которых мало, нужно заказать)
    // Используем прямой SQL запрос для обхода проблем с отсутствующими колонками
    let products: any[] = [];
    try {
      // Проверяем, существует ли таблица ProductOrderInfo
      const orderInfoTableExists = await prisma.$queryRaw`
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'ProductOrderInfo' 
        LIMIT 1;
      ` as any[];
      
      if (orderInfoTableExists && orderInfoTableExists.length > 0) {
        // Если таблица существует, используем JOIN
        products = await prisma.$queryRaw`
          SELECT 
            p.id,
            p.name,
            p.price,
            p.stock,
            p."isHidden",
            p."categoryId",
            c.name as "categoryName",
            oi."officialName",
            oi."quantityPerBox"
          FROM "Product" p
          LEFT JOIN "Category" c ON c.id = p."categoryId"
          LEFT JOIN "ProductOrderInfo" oi ON oi."productId" = p.id
          WHERE p.stock <= 15
            AND p."isHidden" = false
          ORDER BY p.stock ASC, p.name ASC
        ` as any[];
      } else {
        // Если таблицы нет, используем простой запрос без orderInfo
        products = await prisma.$queryRaw`
          SELECT 
            p.id,
            p.name,
            p.price,
            p.stock,
            p."isHidden",
            p."categoryId",
            c.name as "categoryName"
          FROM "Product" p
          LEFT JOIN "Category" c ON c.id = p."categoryId"
          WHERE p.stock <= 15
            AND p."isHidden" = false
          ORDER BY p.stock ASC, p.name ASC
        ` as any[];
      }
    } catch (dbError: any) {
      console.error("Error fetching products:", dbError);
      // Возвращаем пустой массив вместо ошибки
      return NextResponse.json([]);
    }

    // Форматируем результат для клиента
    const formatted = (products || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      price: Number(p.price) || 0,
      stock: Number(p.stock) || 0,
      isHidden: p.isHidden || false,
      categoryId: p.categoryId || null,
      categoryRef: p.categoryName ? { name: p.categoryName } : null,
      category: p.categoryName || null,
      orderInfo: p.officialName ? {
        officialName: p.officialName,
        quantityPerBox: p.quantityPerBox ? Number(p.quantityPerBox) : null,
      } : null,
    }));

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
        if (langameSettings?.excludedProductIds && langameSettings.excludedProductIds.length > 0 && formatted.length > 0) {
          // Получаем langameId для каждого продукта
          const productIds = formatted.map(p => p.id);
          const productsWithLangame = await prisma.$queryRaw`
            SELECT id, "langameId" FROM "Product" WHERE id = ANY(${productIds}::TEXT[])
          ` as any[];
          
          const langameMap = new Map(productsWithLangame.map((p: any) => [p.id, p.langameId]));
          const filtered = formatted.filter((p: any) => {
            const langameId = langameMap.get(p.id);
            return !langameId || !langameSettings.excludedProductIds.includes(langameId);
          });
          return NextResponse.json(filtered);
        }
      }
    } catch (error) {
      // Игнорируем ошибки при получении настроек
      console.warn("Error checking LangameSettings:", error);
    }

    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error("Error fetching products for order:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка получения списка товаров" },
      { status: 500 }
    );
  }
}

