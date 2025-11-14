import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { fetchLangameGoods, type LangameSettings } from "@/lib/langame";

/**
 * Автоматическая синхронизация остатков товаров с Langame
 * Обновляет только остатки (stock) без изменения других полей
 * Также обновляет countSystem в активных пересчетах (статус DRAFT)
 */
export async function POST() {
  console.log("[API /langame/sync-stock] Starting stock sync");
  try {
    // Проверяем настройки Langame
    const settings = await prisma.langameSettings.findFirst();
    
    if (!settings || !settings.enabled || !settings.apiKey || !settings.clubId) {
      console.log("[API /langame/sync-stock] Langame API not configured or disabled");
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

    // Получаем список исключенных товаров
    const excludedProductIds = (settings.excludedProductIds as number[]) || [];
    console.log(`[API /langame/sync-stock] Excluded product IDs: ${excludedProductIds.length}`);

    // Получаем остатки товаров из Langame
    console.log("[API /langame/sync-stock] Fetching goods from Langame...");
    const goodsData = await fetchLangameGoods(langameSettings);
    console.log(`[API /langame/sync-stock] Received ${goodsData.length} goods from Langame`);

    // Создаем карту остатков по langameId
    const stockMap = new Map<number, number>();
    for (const good of goodsData) {
      if (good.product_id && good.quantity !== undefined && good.quantity !== null) {
        const productId = Number(good.product_id);
        const quantity = Number(good.quantity);
        if (!isNaN(productId) && !isNaN(quantity)) {
          // Суммируем остатки по всем складам для одного товара
          const currentStock = stockMap.get(productId) || 0;
          stockMap.set(productId, currentStock + quantity);
        }
      }
    }

    console.log(`[API /langame/sync-stock] Stock map created with ${stockMap.size} products`);

    // Получаем все товары из базы данных
    const products = await prisma.product.findMany({
      where: {
        langameId: { not: null },
        isHidden: false,
      },
    });

    console.log(`[API /langame/sync-stock] Found ${products.length} products in database`);

    let updated = 0;
    let updatedCounts = 0;
    const stockChanges: Array<{ productId: string; langameId: number; oldStock: number; newStock: number }> = [];

    // Обновляем остатки товаров
    for (const product of products) {
      if (!product.langameId) continue;
      
      const langameId = Number(product.langameId);
      if (isNaN(langameId)) continue;

      // Пропускаем исключенные товары
      if (excludedProductIds.includes(langameId)) {
        continue;
      }

      const newStock = stockMap.get(langameId) ?? 0;
      const oldStock = product.stock ?? 0;

      // Обновляем только если остаток изменился
      if (newStock !== oldStock) {
        try {
          await prisma.product.update({
            where: { id: product.id },
            data: { stock: newStock, lastImportedAt: new Date() },
          });
          updated++;
          stockChanges.push({
            productId: product.id,
            langameId,
            oldStock,
            newStock,
          });
          console.log(`[API /langame/sync-stock] Updated product ${product.name} (langameId: ${langameId}): ${oldStock} -> ${newStock}`);
        } catch (error: any) {
          console.error(`[API /langame/sync-stock] Error updating product ${product.id}:`, error);
        }
      }
    }

    // Обновляем countSystem в активных пересчетах (статус DRAFT)
    if (stockChanges.length > 0) {
      console.log(`[API /langame/sync-stock] Updating active inventory counts...`);
      
      // Получаем все активные пересчеты
      const activeCounts = await prisma.inventoryCountHistory.findMany({
        where: {
          status: "DRAFT",
        },
      });

      console.log(`[API /langame/sync-stock] Found ${activeCounts.length} active inventory counts`);

      for (const count of activeCounts) {
        if (!count.data) continue;

        const countData = count.data as Record<string, { system: string; actual: string; replacementId?: string }>;
        let hasChanges = false;
        const updatedCountData = { ...countData };

        // Обновляем countSystem для товаров, остатки которых изменились
        for (const change of stockChanges) {
          // Находим товар по langameId
          const product = products.find(p => p.id === change.productId);
          if (!product) continue;

          // Ищем в данных пересчета товар по ID
          if (updatedCountData[product.id]) {
            // Обновляем countSystem на новый остаток
            updatedCountData[product.id] = {
              ...updatedCountData[product.id],
              system: String(change.newStock),
            };
            hasChanges = true;
            console.log(`[API /langame/sync-stock] Updated countSystem for product ${product.name} in count ${count.id}: ${updatedCountData[product.id].system} -> ${change.newStock}`);
          }
        }

        // Сохраняем обновленные данные пересчета
        if (hasChanges) {
          try {
            await prisma.inventoryCountHistory.update({
              where: { id: count.id },
              data: { data: updatedCountData },
            });
            updatedCounts++;
            console.log(`[API /langame/sync-stock] Updated inventory count ${count.id}`);
          } catch (error: any) {
            console.error(`[API /langame/sync-stock] Error updating inventory count ${count.id}:`, error);
          }
        }
      }
    }

    console.log("[API /langame/sync-stock] Stock sync completed");
    console.log(`[API /langame/sync-stock] Statistics: Updated ${updated} products, Updated ${updatedCounts} inventory counts`);

    return NextResponse.json({
      success: true,
      updated,
      updatedCounts,
      stockChanges: stockChanges.length,
    });
  } catch (error: any) {
    console.error("[API /langame/sync-stock] Unexpected error:", error);
    console.error("[API /langame/sync-stock] Error message:", error?.message);
    console.error("[API /langame/sync-stock] Error stack:", error?.stack);
    return NextResponse.json(
      { 
        error: error?.message || "Внутренняя ошибка сервера",
        details: error?.code || error?.name,
      },
      { status: 500 }
    );
  }
}

