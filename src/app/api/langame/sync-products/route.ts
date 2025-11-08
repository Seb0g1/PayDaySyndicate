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
    let skippedExcluded = 0;

    // Получаем список исключенных ID товаров
    const excludedIds = settings.excludedProductIds || [];
    
    // Синхронизируем только активные товары (active != 0), пропускаем исключенные
    console.log("[API /langame/sync-products] Starting product sync loop, products count:", products.length);
    console.log("[API /langame/sync-products] NOTE: Only active products (active != 0) will be synced. Inactive products (active = 0) will be skipped.");
    console.log("[API /langame/sync-products] Excluded product IDs:", excludedIds);
    
    // Логируем информацию о товарах для отладки
    if (products.length > 0) {
      console.log("[API /langame/sync-products] Sample products data (first 3):", JSON.stringify(products.slice(0, 3), null, 2));
      console.log("[API /langame/sync-products] Products fields:", Object.keys(products[0]));
    }
    
    // Счетчики для статистики
    let skippedInactive = 0;
    let skippedExcluded = 0;
    let skippedMissingId = 0;
    let skippedErrors = 0;
    
    for (const product of products) {
      try {
        if (!product.id || !product.name) {
          skippedMissingId++;
          console.log(`[API /langame/sync-products] Skipping product: missing id or name, id=${product.id}, name=${product.name}`);
          continue;
        }
        
        // Специальное логирование для товара "Cyber Буррито курица" или "Cyber Буррито (Курица)" или ID 883
        const isBurrito = (product.id === 883) || (product.name && (
          product.name.toLowerCase().includes("буррито") || 
          product.name.toLowerCase().includes("burrito")
        ));
        if (isBurrito) {
          console.log(`[API /langame/sync-products] === BURRITO PRODUCT FOUND (ID: ${product.id}) ===`);
          console.log(`[API /langame/sync-products] Product ID: ${product.id}`);
          console.log(`[API /langame/sync-products] Product Name: ${product.name}`);
          console.log(`[API /langame/sync-products] Product Full Data:`, JSON.stringify(product, null, 2));
        }
        
        // Проверяем активность товара
        // Если active = 0, товар неактивен и его не нужно синхронизировать
        // Если active отсутствует (undefined), считаем товар активным
        const activeValue = (product as any).active;
        const activeNum = Number(activeValue);
        
        if (isBurrito) {
          console.log(`[API /langame/sync-products] === BURRITO PRODUCT ACTIVE CHECK ===`);
          console.log(`[API /langame/sync-products] activeValue: ${activeValue} (type: ${typeof activeValue})`);
          console.log(`[API /langame/sync-products] activeNum: ${activeNum}`);
          console.log(`[API /langame/sync-products] activeValue === undefined: ${activeValue === undefined}`);
          console.log(`[API /langame/sync-products] activeValue === null: ${activeValue === null}`);
        }
        
        // Проверяем, является ли товар неактивным (active = 0)
        // Если active отсутствует (undefined или null), считаем товар активным
        const isInactive = 
          (activeValue !== undefined && activeValue !== null) && (
            activeValue === 0 || 
            activeValue === "0" || 
            activeValue === false ||
            (typeof activeValue === "string" && activeValue.toLowerCase() === "false") ||
            (activeNum === 0 && !isNaN(activeNum))
          );
        
        if (isBurrito) {
          console.log(`[API /langame/sync-products] === BURRITO PRODUCT IS INACTIVE: ${isInactive} ===`);
        }
        
        // Пропускаем неактивные товары (active = 0)
        if (isInactive) {
          skippedInactive++;
          if (isBurrito || created + updated < 5 || skippedInactive <= 5) {
            console.log(`[API /langame/sync-products] Skipping inactive product: id=${product.id}, name=${product.name}, active=${activeValue} (type: ${typeof activeValue})`);
            if (isBurrito) {
              console.log(`[API /langame/sync-products] === BURRITO PRODUCT SKIPPED (INACTIVE: active=0) ===`);
            }
          }
          continue;
        }
        
        // Логируем информацию о товаре для отладки
        if (isBurrito || created + updated < 5) {
          console.log(`[API /langame/sync-products] Processing product: id=${product.id}, name=${product.name}, active=${activeValue} (type: ${typeof activeValue})`);
        }
        
        // Пропускаем товары из списка исключений
        if (excludedIds.includes(product.id)) {
          skippedExcluded++;
          if (isBurrito || skippedExcluded <= 5) {
            console.log(`[API /langame/sync-products] Skipping excluded product: id=${product.id}, name=${product.name}`);
            if (isBurrito) {
              console.log(`[API /langame/sync-products] === BURRITO PRODUCT SKIPPED (EXCLUDED) ===`);
              console.log(`[API /langame/sync-products] Product ID ${product.id} is in excluded list:`, excludedIds);
            }
          }
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

        if (isBurrito) {
          console.log(`[API /langame/sync-products] === BURRITO PRODUCT PROCESSING ===`);
          console.log(`[API /langame/sync-products] Stock: ${stock}, Price: ${price}, PriceFromGoods: ${priceFromGoods}, PriceFromProduct: ${priceFromProduct}`);
          console.log(`[API /langame/sync-products] Goods data:`, goodsData);
          console.log(`[API /langame/sync-products] Product fields:`, Object.keys(product));
        }
        
        let existing;
        try {
          existing = await prisma.product.findUnique({
            where: { langameId: product.id },
          });
        } catch (dbError: any) {
          console.error(`[API /langame/sync-products] Error finding existing product for langameId ${product.id}:`, dbError);
          if (isBurrito) {
            console.error(`[API /langame/sync-products] === BURRITO PRODUCT DB ERROR ===`);
            console.error(`[API /langame/sync-products] Error details:`, {
              message: dbError?.message,
              code: dbError?.code,
              name: dbError?.name,
            });
          }
          // Продолжаем обработку, даже если не удалось найти существующий товар
          existing = null;
        }

        if (isBurrito) {
          console.log(`[API /langame/sync-products] Existing product found:`, existing ? `Yes (ID: ${existing.id}, name: ${existing.name})` : "No");
        }

        if (existing) {
          // Обновляем остаток
          // Цену НЕ обновляем из API, если она уже установлена вручную (не 0)
          // Это позволяет пользователю устанавливать цены вручную, и они будут сохраняться
          // isHidden НЕ обновляем - сохраняем текущее значение
          const updateData: any = {
            stock: stock,
            lastImportedAt: new Date(),
            // Явно НЕ устанавливаем isHidden, чтобы не скрывать товар
          };
          
          // Обновляем цену только если:
          // 1. Текущая цена = 0 (товар новый или цена не была установлена)
          // 2. И есть цена в API
          const currentPrice = Number(existing.price);
          if (currentPrice === 0 && price !== undefined && price !== null && !isNaN(price) && price > 0) {
            updateData.price = price;
          }
          
          if (isBurrito) {
            console.log(`[API /langame/sync-products] === BURRITO PRODUCT UPDATING ===`);
            console.log(`[API /langame/sync-products] Existing product:`, {
              id: existing.id,
              name: existing.name,
              currentPrice: currentPrice,
              currentStock: existing.stock,
            });
            console.log(`[API /langame/sync-products] Update data:`, updateData);
          }
          
          try {
            const updatedProduct = await prisma.product.update({
              where: { id: existing.id },
              data: updateData,
            });
            updated++;
            if (isBurrito) {
              console.log(`[API /langame/sync-products] === BURRITO PRODUCT UPDATED SUCCESSFULLY ===`);
              console.log(`[API /langame/sync-products] Updated product data:`, {
                id: updatedProduct.id,
                name: updatedProduct.name,
                price: updatedProduct.price,
                stock: updatedProduct.stock,
                isHidden: updatedProduct.isHidden,
                langameId: updatedProduct.langameId,
                lastImportedAt: updatedProduct.lastImportedAt,
              });
              // Проверяем, что товар действительно обновлен в базе данных
              const verifyProduct = await prisma.product.findUnique({
                where: { id: existing.id },
              });
              if (verifyProduct) {
                console.log(`[API /langame/sync-products] === BURRITO PRODUCT VERIFIED IN DB ===`);
                console.log(`[API /langame/sync-products] Verified product:`, {
                  id: verifyProduct.id,
                  name: verifyProduct.name,
                  stock: verifyProduct.stock,
                  isHidden: verifyProduct.isHidden,
                  langameId: verifyProduct.langameId,
                });
              } else {
                console.error(`[API /langame/sync-products] === BURRITO PRODUCT NOT FOUND IN DB AFTER UPDATE ===`);
              }
            }
          } catch (updateError: any) {
            console.error(`[API /langame/sync-products] Error updating product ${existing.id}:`, updateError);
            if (isBurrito) {
              console.error(`[API /langame/sync-products] === BURRITO PRODUCT UPDATE ERROR ===`);
              console.error(`[API /langame/sync-products] Error details:`, {
                message: updateError?.message,
                code: updateError?.code,
                name: updateError?.name,
              });
            }
            throw updateError;
          }
        } else {
          // Создаем новый товар
          // Если цена не найдена, устанавливаем 0
          const finalPrice = (price !== undefined && price !== null && !isNaN(price) && price > 0) ? price : 0;
          
          if (isBurrito) {
            console.log(`[API /langame/sync-products] === BURRITO PRODUCT CREATING ===`);
            console.log(`[API /langame/sync-products] Create data:`, {
              name: product.name,
              price: finalPrice,
              stock: stock,
              langameId: product.id,
            });
          }
          
          try {
            const createdProduct = await prisma.product.create({
              data: {
                name: product.name,
                price: finalPrice,
                stock: stock,
                langameId: product.id,
                lastImportedAt: new Date(),
                isHidden: false, // Явно устанавливаем isHidden = false для новых товаров
              },
            });
            created++;
            if (isBurrito) {
              console.log(`[API /langame/sync-products] === BURRITO PRODUCT CREATED SUCCESSFULLY ===`);
              console.log(`[API /langame/sync-products] Created product data:`, {
                id: createdProduct.id,
                name: createdProduct.name,
                price: createdProduct.price,
                stock: createdProduct.stock,
                isHidden: createdProduct.isHidden,
                langameId: createdProduct.langameId,
                lastImportedAt: createdProduct.lastImportedAt,
              });
              // Проверяем, что товар действительно создан в базе данных
              const verifyProduct = await prisma.product.findUnique({
                where: { langameId: product.id },
              });
              if (verifyProduct) {
                console.log(`[API /langame/sync-products] === BURRITO PRODUCT VERIFIED IN DB ===`);
                console.log(`[API /langame/sync-products] Verified product:`, {
                  id: verifyProduct.id,
                  name: verifyProduct.name,
                  stock: verifyProduct.stock,
                  isHidden: verifyProduct.isHidden,
                  langameId: verifyProduct.langameId,
                });
              } else {
                console.error(`[API /langame/sync-products] === BURRITO PRODUCT NOT FOUND IN DB AFTER CREATE ===`);
              }
            }
          } catch (createError: any) {
            console.error(`[API /langame/sync-products] Error creating product ${product.id} (${product.name}):`, createError);
            if (isBurrito) {
              console.error(`[API /langame/sync-products] === BURRITO PRODUCT CREATE ERROR ===`);
              console.error(`[API /langame/sync-products] Error details:`, {
                message: createError?.message,
                code: createError?.code,
                name: createError?.name,
              });
            }
            throw createError;
          }
        }
      } catch (productError: any) {
        skippedErrors++;
        const isBurrito = (product.id === 883) || (product.name && (
          product.name.toLowerCase().includes("буррито") || 
          product.name.toLowerCase().includes("burrito")
        ));
        console.error(`[API /langame/sync-products] Error processing product ${product.id} (${product.name}):`, productError);
        console.error(`[API /langame/sync-products] Error stack:`, productError?.stack);
        if (isBurrito || skippedErrors <= 5) {
          console.error(`[API /langame/sync-products] Error details:`, {
            message: productError?.message,
            code: productError?.code,
            name: productError?.name,
          });
        }
        if (isBurrito) {
          console.error(`[API /langame/sync-products] === BURRITO PRODUCT ERROR ===`);
        }
        // Продолжаем обработку других товаров
        continue;
      }
    }
    console.log("[API /langame/sync-products] Product sync loop completed");
    console.log("[API /langame/sync-products] Statistics:");
    console.log("[API /langame/sync-products]   - Total products from API:", products.length);
    console.log("[API /langame/sync-products]   - Created:", created);
    console.log("[API /langame/sync-products]   - Updated:", updated);
    console.log("[API /langame/sync-products]   - Skipped (inactive):", skippedInactive);
    console.log("[API /langame/sync-products]   - Skipped (excluded):", skippedExcluded);
    console.log("[API /langame/sync-products]   - Skipped (missing id/name):", skippedMissingId);
    console.log("[API /langame/sync-products]   - Skipped (errors):", skippedErrors);
    console.log("[API /langame/sync-products]   - Total processed (created + updated):", created + updated);
    console.log("[API /langame/sync-products]   - Total skipped:", skippedInactive + skippedExcluded + skippedMissingId + skippedErrors);
    console.log("[API /langame/sync-products]   - Expected total:", products.length, "Actual total:", created + updated + skippedInactive + skippedExcluded + skippedMissingId + skippedErrors);

          console.log("[API /langame/sync-products] Sync completed successfully");
          return NextResponse.json({
            success: true,
            created,
            updated,
            skippedExcluded,
            skippedInactive,
            skippedMissingId,
            skippedErrors,
            total: Array.isArray(products) ? products.length : 0,
            processed: created + updated,
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

