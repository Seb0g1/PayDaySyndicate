import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/guards";
import { NextResponse } from "next/server";
import { fetchLangameGoods, fetchLangameProducts, type LangameSettings } from "@/lib/langame";

export async function POST() {
  const forbidden = await requireAdmin();
  if (forbidden) return forbidden;

  try {
    // Проверяем, существует ли таблица LangameSettings
    const tableExists = await prisma.$queryRaw`
      SELECT 1 FROM information_schema.tables 
      WHERE table_name = 'LangameSettings' 
      LIMIT 1;
    ` as any[];
    
    if (!tableExists || tableExists.length === 0) {
      return NextResponse.json(
        { error: "Таблица LangameSettings не существует" },
        { status: 400 }
      );
    }
    
    const settings = await prisma.langameSettings.findFirst();
    if (!settings || !settings.enabled || !settings.apiKey || !settings.clubId) {
      return NextResponse.json(
        { error: "Langame API не настроен или отключен" },
        { status: 400 }
      );
    }

    const langameSettings: LangameSettings = {
      apiKey: settings.apiKey,
      clubId: settings.clubId,
      baseUrl: settings.baseUrl || undefined,
    };

    // Получаем продукты из Langame API (список с активностью)
    let products: any[];
    try {
      const productsResponse = await fetchLangameProducts(langameSettings);
      // Убеждаемся, что это массив
      if (!Array.isArray(productsResponse)) {
        console.error("Langame API returned non-array response for products:", productsResponse);
        return NextResponse.json(
          { error: "Langame API вернул неверный формат данных (ожидался массив)" },
          { status: 500 }
        );
      }
      products = productsResponse;
    } catch (apiError: any) {
      console.error("Error fetching products from Langame API:", apiError);
      return NextResponse.json(
        { error: `Ошибка получения продуктов из Langame API: ${apiError.message || "Неизвестная ошибка"}` },
        { status: 500 }
      );
    }

    // Получаем остатки товаров из Langame API
    let goods: any[] = [];
    try {
      const goodsResponse = await fetchLangameGoods(langameSettings);
      if (Array.isArray(goodsResponse)) {
        goods = goodsResponse;
        // Логируем первые несколько товаров для отладки
        if (goods.length > 0) {
          console.log("Sample goods data (first 3):", JSON.stringify(goods.slice(0, 3), null, 2));
          console.log("Goods fields:", Object.keys(goods[0]));
        }
      }
    } catch (apiError: any) {
      console.warn("Error fetching goods (stock) from Langame API:", apiError);
      // Не критично, продолжаем без остатков
    }

    // Логируем первые несколько продуктов для отладки
    if (products.length > 0) {
      console.log("Sample products data (first 3):", JSON.stringify(products.slice(0, 3), null, 2));
      console.log("Products fields:", Object.keys(products[0]));
    }

    // Создаем Map для быстрого доступа к остаткам и ценам по ID товара
    const goodsMap = new Map<number, { count: number; price?: number }>();
    for (const good of goods) {
      if (good.id) {
        // Проверяем различные возможные поля для цены
        // Пробуем все возможные варианты названий полей
        const price = good.price || good.cost || good.pricePerUnit || good.unitPrice || 
                     good.sellingPrice || good.salePrice || good.retailPrice || 
                     good.price_per_unit || good.unit_price || good.cost_price ||
                     (typeof good.price === 'number' ? good.price : undefined);
        
        if (price !== undefined && price !== null) {
          console.log(`Found price for product ${good.id}: ${price} (from field: ${Object.keys(good).find(k => good[k] === price)})`);
        }
        
        goodsMap.set(good.id, {
          count: good.count || 0,
          price: price !== undefined && price !== null ? Number(price) : undefined,
        });
      }
    }

    let updated = 0;
    let created = 0;
    let skippedInactive = 0;
    let skippedExcluded = 0;

    // Получаем список исключенных ID товаров
    const excludedIds = settings.excludedProductIds || [];
    
    // Синхронизируем товары (только активные, пропускаем исключенные)
    for (const product of products) {
      if (!product.id || !product.name) continue;
      
      // Пропускаем товары, которые не активны (active !== 1)
      if (product.active !== 1) {
        skippedInactive++;
        continue;
      }
      
      // Пропускаем товары из списка исключений
      if (excludedIds.includes(product.id)) {
        skippedExcluded++;
        continue;
      }

      // Получаем остаток и цену из goodsMap
      const goodsData = goodsMap.get(product.id);
      const stock = goodsData?.count || 0;
      const priceFromGoods = goodsData?.price;
      
      // Проверяем, есть ли цена в самом объекте product (может быть в /products/list)
      // Пробуем все возможные варианты названий полей
      const priceFromProduct = (product as any).price || (product as any).cost || 
                               (product as any).pricePerUnit || (product as any).unitPrice ||
                               (product as any).sellingPrice || (product as any).salePrice || 
                               (product as any).retailPrice || (product as any).price_per_unit ||
                               (product as any).unit_price || (product as any).cost_price ||
                               undefined;
      
      const price = priceFromGoods !== undefined ? priceFromGoods : (priceFromProduct !== undefined ? Number(priceFromProduct) : undefined);
      
      // Логируем, если цена найдена
      if (price !== undefined && price !== null && price > 0) {
        console.log(`Product ${product.id} (${product.name}): price = ${price}`);
      } else if (product.id === products[0]?.id) {
        // Логируем для первого продукта, если цена не найдена
        console.log(`Product ${product.id} (${product.name}): price NOT found. Goods data:`, goodsData, "Product data fields:", Object.keys(product));
      }

      const existing = await prisma.product.findUnique({
        where: { langameId: product.id },
      });

      if (existing) {
        // Обновляем остаток
        // Цену НЕ обновляем из API, если она уже установлена вручную (не 0)
        // Это позволяет пользователю устанавливать цены вручную, и они будут сохраняться
        const updateData: any = {
          stock: stock,
          lastImportedAt: new Date(),
        };
        
        // Обновляем цену только если:
        // 1. Текущая цена = 0 (товар новый или цена не была установлена)
        // 2. И есть цена в API
        const currentPrice = Number(existing.price);
        if (currentPrice === 0 && price !== undefined && price !== null && !isNaN(price) && price > 0) {
          updateData.price = price;
        }
        
        await prisma.product.update({
          where: { id: existing.id },
          data: updateData,
        });
        updated++;
      } else {
        // Создаем новый товар
        // Если цена не найдена, устанавливаем 0
        const finalPrice = (price !== undefined && price !== null && !isNaN(price) && price > 0) ? price : 0;
        
        await prisma.product.create({
          data: {
            name: product.name,
            price: finalPrice,
            stock: stock,
            langameId: product.id,
            lastImportedAt: new Date(),
          },
        });
        created++;
      }
    }

      return NextResponse.json({
        success: true,
        created,
        updated,
        skippedInactive,
        skippedExcluded,
        total: Array.isArray(products) ? products.length : 0,
      });
  } catch (error: any) {
    console.error("Error syncing products:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка синхронизации товаров" },
      { status: 500 }
    );
  }
}

