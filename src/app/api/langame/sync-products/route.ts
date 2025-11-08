import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/guards";
import { NextResponse } from "next/server";
import { fetchLangameGoods, fetchLangameProducts, type LangameSettings } from "@/lib/langame";

export async function POST() {
  console.log("[API /langame/sync-products] Starting sync request");
  try {
    // Check admin access - wrap in try-catch to handle errors
    console.log("[API /langame/sync-products] Checking admin access...");
    let forbidden;
    try {
      forbidden = await requireAdmin();
      console.log("[API /langame/sync-products] Admin check completed, forbidden:", !!forbidden);
    } catch (error: any) {
      console.error("[API /langame/sync-products] Error checking admin access:", error);
      console.error("[API /langame/sync-products] Error stack:", error?.stack);
      return NextResponse.json(
        { error: "Failed to verify admin access", details: error?.message },
        { status: 500 }
      );
    }
    
    if (forbidden) {
      console.log("[API /langame/sync-products] Access forbidden");
      return forbidden;
    }

    // Проверяем, существует ли таблица LangameSettings
    console.log("[API /langame/sync-products] Checking if LangameSettings table exists...");
    let tableExists;
    try {
      tableExists = await prisma.$queryRaw`
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'LangameSettings' 
        LIMIT 1;
      ` as any[];
      console.log("[API /langame/sync-products] Table check completed, exists:", !!tableExists?.length);
    } catch (error: any) {
      console.error("[API /langame/sync-products] Error checking table existence:", error);
      console.error("[API /langame/sync-products] Error stack:", error?.stack);
      return NextResponse.json(
        { 
          error: "Ошибка проверки таблицы LangameSettings",
          details: error?.message,
          success: false,
          created: 0,
          updated: 0,
          skippedInactive: 0,
          skippedExcluded: 0,
          total: 0,
        },
        { status: 500 }
      );
    }
    
    if (!tableExists || tableExists.length === 0) {
      console.log("[API /langame/sync-products] LangameSettings table does not exist");
      return NextResponse.json(
        { 
          error: "Таблица LangameSettings не существует",
          success: false,
          created: 0,
          updated: 0,
          skippedInactive: 0,
          skippedExcluded: 0,
          total: 0,
        },
        { status: 400 }
      );
    }
    
    console.log("[API /langame/sync-products] Fetching LangameSettings...");
    let settings;
    try {
      settings = await prisma.langameSettings.findFirst();
      console.log("[API /langame/sync-products] Settings fetched, enabled:", settings?.enabled, "hasApiKey:", !!settings?.apiKey, "hasClubId:", !!settings?.clubId);
    } catch (error: any) {
      console.error("[API /langame/sync-products] Error fetching settings:", error);
      console.error("[API /langame/sync-products] Error stack:", error?.stack);
      return NextResponse.json(
        { error: "Ошибка получения настроек Langame", details: error?.message },
        { status: 500 }
      );
    }
    
    if (!settings || !settings.enabled || !settings.apiKey || !settings.clubId) {
      console.log("[API /langame/sync-products] Langame API not configured or disabled");
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
    
    console.log("[Langame Sync] Settings:", {
      baseUrl: langameSettings.baseUrl,
      clubId: langameSettings.clubId,
      apiKey: langameSettings.apiKey ? "***" : "missing",
    });

    // Получаем продукты из Langame API (список с активностью)
    console.log("[API /langame/sync-products] Fetching products from Langame API...");
    let products: any[];
    try {
      const productsResponse = await fetchLangameProducts(langameSettings);
      console.log("[API /langame/sync-products] Products response received, isArray:", Array.isArray(productsResponse), "length:", Array.isArray(productsResponse) ? productsResponse.length : "N/A");
      // Убеждаемся, что это массив
      if (!Array.isArray(productsResponse)) {
        console.error("[API /langame/sync-products] Langame API returned non-array response for products:", productsResponse);
        return NextResponse.json(
          { error: "Langame API вернул неверный формат данных (ожидался массив)", details: typeof productsResponse },
          { status: 500 }
        );
      }
      products = productsResponse;
      console.log("[API /langame/sync-products] Products fetched successfully, count:", products.length);
    } catch (apiError: any) {
      console.error("[API /langame/sync-products] Error fetching products from Langame API:", apiError);
      console.error("[API /langame/sync-products] Error stack:", apiError?.stack);
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
    console.log("[API /langame/sync-products] Starting product sync loop, products count:", products.length);
    
    // Собираем статистику по значениям active
    const activeStats: Record<string, number> = {};
    const activeValueExamples: Record<string, any[]> = {};
    
    // Логируем первые несколько товаров для отладки проверки active
    if (products.length > 0) {
      console.log("[API /langame/sync-products] Analyzing active field values...");
      for (let i = 0; i < Math.min(20, products.length); i++) {
        const p = products[i];
        const activeVal = (p as any).active;
        const activeKey = String(activeVal) + " (type: " + typeof activeVal + ")";
        
        if (!activeStats[activeKey]) {
          activeStats[activeKey] = 0;
          activeValueExamples[activeKey] = [];
        }
        activeStats[activeKey]++;
        
        if (activeValueExamples[activeKey].length < 3) {
          activeValueExamples[activeKey].push({
            id: p.id,
            name: p.name,
            active: activeVal,
            allKeys: Object.keys(p),
          });
        }
      }
      
      console.log("[API /langame/sync-products] Active field statistics (first 20 products):");
      for (const [key, count] of Object.entries(activeStats)) {
        console.log(`  ${key}: ${count} products`);
        if (activeValueExamples[key] && activeValueExamples[key].length > 0) {
          console.log(`    Examples:`, JSON.stringify(activeValueExamples[key], null, 2));
        }
      }
    }
    
    for (const product of products) {
      try {
        if (!product.id || !product.name) {
          console.log(`[API /langame/sync-products] Skipping product: missing id or name, id=${product.id}, name=${product.name}`);
          continue;
        }
        
        // Проверяем активность товара - более гибкая проверка
        // active может быть: 1, "1", true, или отсутствовать
        const activeValue = (product as any).active;
        
        // Проверяем различные варианты активного состояния
        // Также проверяем обратную логику (может быть active=0 означает активный)
        const numValue = Number(activeValue);
        const isActiveValue = 
          activeValue === 1 || 
          activeValue === "1" || 
          activeValue === true || 
          (typeof activeValue === "string" && activeValue.toLowerCase() === "true") ||
          (numValue === 1 && !isNaN(numValue)); // Пробуем преобразовать в число
        
        // Проверяем обратную логику (может быть 0 = активный, 1 = неактивный)
        const isInactiveValue = 
          activeValue === 0 || 
          activeValue === "0" || 
          activeValue === false ||
          (typeof activeValue === "string" && activeValue.toLowerCase() === "false") ||
          (numValue === 0 && !isNaN(numValue));
        
        // Если active отсутствует или равен undefined/null, считаем товар активным
        const hasActiveField = activeValue !== undefined && activeValue !== null;
        
        // Если поле active отсутствует, считаем товар активным
        // Если поле есть, проверяем значение
        let isActive: boolean;
        if (!hasActiveField) {
          isActive = true; // Если поле active отсутствует, считаем товар активным
        } else if (isInactiveValue) {
          isActive = false; // Явно неактивный
        } else if (isActiveValue) {
          isActive = true; // Явно активный
        } else {
          // Если значение не распознано, считаем активным (на всякий случай)
          isActive = true;
          console.warn(`[API /langame/sync-products] Unknown active value for product ${product.id}: ${activeValue} (type: ${typeof activeValue}), treating as active`);
        }
        
        // Логируем первые несколько товаров для отладки
        if (product.id === products[0]?.id || product.id === products[1]?.id || product.id === products[2]?.id) {
          console.log(`[API /langame/sync-products] Product ${product.id} (${product.name}): active=${activeValue} (type: ${typeof activeValue}), hasActiveField=${hasActiveField}, isActive=${isActive}`);
          console.log(`[API /langame/sync-products] Product ${product.id} all fields:`, Object.keys(product).map(k => `${k}=${(product as any)[k]}`).join(', '));
        }
        
        // Пропускаем товары, которые не активны
        if (!isActive) {
          skippedInactive++;
          if (skippedInactive <= 20) { // Логируем первые 20 пропущенных
            console.log(`[API /langame/sync-products] Skipping inactive product: id=${product.id}, name=${product.name}, active=${activeValue} (type: ${typeof activeValue}), isActiveValue=${isActiveValue}`);
          }
          continue;
        }
        
        // Логируем первые несколько активных товаров
        if (created + updated < 5) {
          console.log(`[API /langame/sync-products] Processing active product: id=${product.id}, name=${product.name}, active=${activeValue} (type: ${typeof activeValue})`);
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
      } catch (productError: any) {
        console.error(`[API /langame/sync-products] Error processing product ${product.id} (${product.name}):`, productError);
        console.error(`[API /langame/sync-products] Error stack:`, productError?.stack);
        // Продолжаем обработку других товаров
        continue;
      }
    }
    console.log("[API /langame/sync-products] Product sync loop completed, created:", created, "updated:", updated, "skippedInactive:", skippedInactive, "skippedExcluded:", skippedExcluded);

    console.log("[API /langame/sync-products] Sync completed successfully");
    return NextResponse.json({
      success: true,
      created,
      updated,
      skippedInactive,
      skippedExcluded,
      total: Array.isArray(products) ? products.length : 0,
    });
  } catch (error: any) {
    console.error("[API /langame/sync-products] Unexpected error:", error);
    console.error("[API /langame/sync-products] Error message:", error?.message);
    console.error("[API /langame/sync-products] Error stack:", error?.stack);
    console.error("[API /langame/sync-products] Error name:", error?.name);
    console.error("[API /langame/sync-products] Error code:", error?.code);
    return NextResponse.json(
      { 
        error: error?.message || "Внутренняя ошибка сервера",
        details: error?.code || error?.name,
      },
      { status: 500 }
    );
  }
}

