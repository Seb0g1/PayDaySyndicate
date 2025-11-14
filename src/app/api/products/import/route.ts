import "server-only";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/guards";
import { prisma } from "@/lib/prisma";

function parseNumber(v: any): number | undefined {
  if (v === undefined || v === null) return undefined;
  const s = String(v).replace(/\s/g, "").replace(",", ".");
  const n = parseFloat(s);
  return isNaN(n) ? undefined : n;
}

export async function POST(req: Request) {
  console.log("[API /products/import] Starting import request");
  try {
    // Check admin access - wrap in try-catch to handle errors
    console.log("[API /products/import] Checking admin access...");
    let forbidden;
    try {
      forbidden = await requireAdmin();
      console.log("[API /products/import] Admin check completed, forbidden:", !!forbidden);
    } catch (error: any) {
      console.error("[API /products/import] Error checking admin access:", error);
      console.error("[API /products/import] Error stack:", error?.stack);
      return NextResponse.json(
        { error: "Failed to verify admin access", details: error?.message },
        { status: 500 }
      );
    }
    
    if (forbidden) {
      console.log("[API /products/import] Access forbidden");
      return forbidden;
    }

    console.log("[API /products/import] Parsing form data...");
    let form;
    try {
      form = await req.formData();
      console.log("[API /products/import] Form data parsed successfully");
    } catch (error: any) {
      console.error("[API /products/import] Error parsing form data:", error);
      console.error("[API /products/import] Error stack:", error?.stack);
      return NextResponse.json(
        { error: "Ошибка парсинга формы", details: error?.message },
        { status: 400 }
      );
    }

    const files = [
      ...form.getAll("file"),
      ...form.getAll("files"),
    ].filter((f): f is File => f instanceof File);
    
    console.log("[API /products/import] Files found:", files.length);
    
    if (files.length === 0) {
      console.log("[API /products/import] No files provided");
      return new NextResponse("No file", { status: 400 });
    }

    console.log("[API /products/import] Importing XLSX library...");
    let XLSX;
    try {
      XLSX = await import("xlsx");
      console.log("[API /products/import] XLSX library imported successfully");
    } catch (error: any) {
      console.error("[API /products/import] Error importing XLSX library:", error);
      console.error("[API /products/import] Error stack:", error?.stack);
      return NextResponse.json(
        { error: "Ошибка загрузки библиотеки XLSX", details: error?.message },
        { status: 500 }
      );
    }

    let created = 0;
    let updated = 0;
    const importedProductNames = new Set<string>(); // Список наименований из Excel

    // Индексы колонок (B,E,I,K)
    const IDX_NAME = 1;     // B
    const IDX_PRICE = 4;    // E
    const IDX_CATEGORY = 8; // I (основная категория)
    const IDX_STOCK = 10;   // K (остаток)

    // Функция для извлечения базового названия (убираем варианты в скобках)
    function getBaseName(fullName: string): string {
      // Убираем все в скобках: "LitEnergy (Granat)" -> "LitEnergy"
      let base = fullName.replace(/\([^)]*\)/g, '').trim();
      // Убираем лишние пробелы
      base = base.replace(/\s+/g, ' ').trim();
      return base;
    }

    // Функция для определения подкатегории на основе базового названия и цены
    function getSubcategory(fullName: string, price: number, baseName: string): string {
      // Если есть что-то в скобках или после базового названия - используем это как подкатегорию
      const match = fullName.match(/\(([^)]+)\)/);
      if (match) {
        // Если есть вариант в скобках, используем базовое название как подкатегорию
        return baseName;
      }
      
      // Если название отличается от базового (например, "Adrenaline Rush 0,25" vs "Adrenaline Rush")
      // Используем полное название как подкатегорию
      if (fullName.trim() !== baseName) {
        return fullName.trim();
      }
      
      // Иначе используем базовое название
      return baseName;
    }

    // Map для группировки товаров по базовому названию + цене
    // Ключ: baseName_price, Значение: подкатегория
    const subcategoryMap = new Map<string, string>();

    for (const file of files) {
      try {
        console.log(`[API /products/import] Processing file: ${file.name}, size: ${file.size} bytes`);
        
        let buf;
        try {
          buf = await file.arrayBuffer();
          console.log(`[API /products/import] File buffer created, size: ${buf.byteLength} bytes`);
        } catch (error: any) {
          console.error(`[API /products/import] Error reading file ${file.name}:`, error);
          console.error(`[API /products/import] Error stack:`, error?.stack);
          continue; // Пропускаем этот файл, продолжаем с другими
        }

        let wb;
        try {
          wb = XLSX.read(buf, { type: "array" });
          console.log(`[API /products/import] Workbook parsed, sheets: ${wb.SheetNames.length}`);
        } catch (error: any) {
          console.error(`[API /products/import] Error parsing Excel file ${file.name}:`, error);
          console.error(`[API /products/import] Error stack:`, error?.stack);
          continue; // Пропускаем этот файл, продолжаем с другими
        }

        if (!wb.SheetNames || wb.SheetNames.length === 0) {
          console.warn(`[API /products/import] No sheets found in file ${file.name}`);
          continue;
        }

        const ws = wb.Sheets[wb.SheetNames[0]];
        // Получаем «сырой» массив строк: каждая строка — массив ячеек
        let rows: any[][];
        try {
          rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false });
          console.log(`[API /products/import] Rows extracted: ${rows.length}`);
        } catch (error: any) {
          console.error(`[API /products/import] Error extracting rows from ${file.name}:`, error);
          console.error(`[API /products/import] Error stack:`, error?.stack);
          continue; // Пропускаем этот файл, продолжаем с другими
        }

        console.log(`[API /products/import] Processing ${rows.length} rows from file ${file.name}`);
        let skippedRows = 0;
        let processedRows = 0;
        
        for (let i = 0; i < rows.length; i++) {
          try {
            const r = rows[i] || [];
            const name = (r[IDX_NAME] || "").toString().trim();
            
            // Логируем первые несколько строк для отладки
            if (i < 5) {
              console.log(`[API /products/import] Row ${i}: name="${name}", price="${r[IDX_PRICE]}", category="${r[IDX_CATEGORY]}", stock="${r[IDX_STOCK]}"`);
            }
            
            // Более гибкая проверка заголовков
            const nameLower = name.toLowerCase();
            if (!name || 
                nameLower === "название" || 
                nameLower === "наименование" ||
                nameLower === "name" ||
                nameLower === "product" ||
                nameLower === "товар" ||
                nameLower.startsWith("название") ||
                nameLower.startsWith("наименование")) {
              if (i < 5) {
                console.log(`[API /products/import] Skipping row ${i}: appears to be header or empty, name="${name}"`);
              }
              skippedRows++;
              continue;
            }
            
            // Добавляем название в список импортированных (нормализованное для сравнения)
            importedProductNames.add(name.toLowerCase());
            
            const price = parseNumber(r[IDX_PRICE]) ?? 0;
            const catNameRaw = (r[IDX_CATEGORY] || "").toString().trim();
            const stock = Math.max(0, Math.floor(parseNumber(r[IDX_STOCK]) ?? 0));
            
            // Извлекаем базовое название
            const baseName = getBaseName(name);
            
            // Определяем подкатегорию на основе базового названия и цены
            const subcategoryKey = `${baseName}_${price}`;
            let subcategory: string;
            
            if (subcategoryMap.has(subcategoryKey)) {
              // Если уже есть товар с таким базовым названием и ценой - используем ту же подкатегорию
              subcategory = subcategoryMap.get(subcategoryKey)!;
            } else {
              // Создаем новую подкатегорию
              subcategory = getSubcategory(name, price, baseName);
              subcategoryMap.set(subcategoryKey, subcategory);
            }
            
            if (i < 5) {
              console.log(`[API /products/import] Row ${i} parsed: name="${name}", baseName="${baseName}", price=${price}, subcategory="${subcategory}", category="${catNameRaw}", stock=${stock}`);
            }

            // создаём/ищем основную категорию
            let categoryId: string | undefined = undefined;
            if (catNameRaw) {
              try {
                const cat = await prisma.category.upsert({ 
                  where: { name: catNameRaw }, 
                  create: { name: catNameRaw }, 
                  update: {} 
                });
                categoryId = cat.id;
              } catch (error: any) {
                console.error(`[API /products/import] Error upserting category "${catNameRaw}":`, error);
                // Продолжаем без категории
              }
            }

            try {
              const existing = await prisma.product.findFirst({ where: { name } });
              if (existing) {
                // Для существующих товаров обновляем остаток, дату импорта, категорию и подкатегорию
                await prisma.product.update({ 
                  where: { id: existing.id }, 
                  data: { 
                    stock, 
                    lastImportedAt: new Date(),
                    categoryId: categoryId || undefined, // Обновляем категорию, если указана в Excel
                    category: subcategory, // Обновляем подкатегорию
                    price: price > 0 ? price : undefined, // Обновляем цену, если она указана
                  } 
                });
                updated++;
                processedRows++;
              } else {
                await prisma.product.create({ 
                  data: { 
                    name, 
                    price, 
                    stock, 
                    categoryId, 
                    category: subcategory, // Сохраняем подкатегорию
                    lastImportedAt: new Date() 
                  } 
                });
                created++;
                processedRows++;
              }
            } catch (error: any) {
              console.error(`[API /products/import] Error processing product "${name}":`, error);
              console.error(`[API /products/import] Error stack:`, error?.stack);
              // Продолжаем обработку других товаров
              continue;
            }
          } catch (error: any) {
            console.error(`[API /products/import] Error processing row ${i}:`, error);
            console.error(`[API /products/import] Error stack:`, error?.stack);
            // Продолжаем обработку других строк
            continue;
          }
        }
        
        console.log(`[API /products/import] File ${file.name} processed: total rows=${rows.length}, skipped=${skippedRows}, processed=${processedRows}, created=${created}, updated=${updated}`);
      } catch (error: any) {
        console.error(`[API /products/import] Error processing file ${file.name}:`, error);
        console.error(`[API /products/import] Error stack:`, error?.stack);
        // Продолжаем обработку других файлов
        continue;
      }
    }
    
    console.log(`[API /products/import] Files processing completed, created: ${created}, updated: ${updated}, imported names: ${importedProductNames.size}`);

    // Исключаем товары, которых нет в Excel файле
    console.log("[API /products/import] Starting product exclusion process...");
    let excluded = 0;
    try {
      // Получаем все товары с langameId (которые могут синхронизироваться)
      console.log("[API /products/import] Fetching products with langameId...");
      const allProductsWithLangame = await prisma.product.findMany({
        where: {
          langameId: { not: null },
          isHidden: false,
        },
        select: {
          id: true,
          name: true,
          langameId: true,
        },
      });
      console.log(`[API /products/import] Found ${allProductsWithLangame.length} products with langameId`);

      // Получаем текущие настройки Langame
      console.log("[API /products/import] Fetching LangameSettings...");
      let langameSettings = await prisma.langameSettings.findFirst();
      const currentExcludedIds = langameSettings?.excludedProductIds || [];
      console.log(`[API /products/import] Current excluded IDs count: ${currentExcludedIds.length}`);

      // Находим товары, которых нет в импортированном списке
      const productsToExclude = allProductsWithLangame.filter(
        (product) => !importedProductNames.has(product.name.toLowerCase())
      );
      console.log(`[API /products/import] Products to exclude: ${productsToExclude.length}`);

      if (productsToExclude.length > 0) {
        // Собираем langameId товаров для исключения
        const langameIdsToExclude = productsToExclude
          .map((p) => p.langameId)
          .filter((id): id is number => id !== null && !currentExcludedIds.includes(id));

        console.log(`[API /products/import] New langameIds to exclude: ${langameIdsToExclude.length}`);

        if (langameIdsToExclude.length > 0) {
          // Объединяем с существующими исключениями
          const updatedExcludedIds = [...currentExcludedIds, ...langameIdsToExclude];

          // Обновляем настройки
          try {
            if (!langameSettings) {
              // Создаем настройки, если их нет
              console.log("[API /products/import] Creating new LangameSettings...");
              langameSettings = await prisma.langameSettings.create({
                data: {
                  excludedProductIds: updatedExcludedIds,
                },
              });
              console.log("[API /products/import] LangameSettings created");
            } else {
              console.log("[API /products/import] Updating LangameSettings...");
              await prisma.langameSettings.update({
                where: { id: langameSettings.id },
                data: {
                  excludedProductIds: updatedExcludedIds,
                },
              });
              console.log("[API /products/import] LangameSettings updated");
            }

            excluded = langameIdsToExclude.length;
            console.log(`[API /products/import] Excluded ${excluded} products`);
          } catch (error: any) {
            console.error("[API /products/import] Error updating LangameSettings:", error);
            console.error("[API /products/import] Error stack:", error?.stack);
            // Не критично, продолжаем
          }
        }
      }
    } catch (error: any) {
      // Игнорируем ошибки при исключении товаров (не критично)
      console.error("[API /products/import] Error excluding products:", error);
      console.error("[API /products/import] Error stack:", error?.stack);
    }

    console.log("[API /products/import] Import completed successfully");
    return NextResponse.json({ created, updated, excluded });
  } catch (error: any) {
    console.error("[API /products/import] Unexpected error:", error);
    console.error("[API /products/import] Error message:", error?.message);
    console.error("[API /products/import] Error stack:", error?.stack);
    console.error("[API /products/import] Error name:", error?.name);
    console.error("[API /products/import] Error code:", error?.code);
    return NextResponse.json(
      { 
        error: error?.message || "Внутренняя ошибка сервера",
        details: error?.code || error?.name,
      },
      { status: 500 }
    );
  }
}


