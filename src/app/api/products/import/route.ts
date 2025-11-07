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
  const forbidden = await requireAdmin();
  if (forbidden) return forbidden;

  const form = await req.formData();
  const files = [
    ...form.getAll("file"),
    ...form.getAll("files"),
  ].filter((f): f is File => f instanceof File);
  if (files.length === 0) return new NextResponse("No file", { status: 400 });

  const XLSX = await import("xlsx");

  let created = 0;
  let updated = 0;
  const importedProductNames = new Set<string>(); // Список наименований из Excel

  for (const file of files) {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    // Получаем «сырой» массив строк: каждая строка — массив ячеек
    const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false });
    // Индексы колонок (B,E,I,K)
    const IDX_NAME = 1;     // B
    const IDX_PRICE = 4;    // E
    const IDX_CATEGORY = 8; // I (основная категория)
    const IDX_STOCK = 10;   // K (остаток)

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i] || [];
      const name = (r[IDX_NAME] || "").toString().trim();
      if (!name || name.toLowerCase() === "название" || name.toLowerCase().includes("наименование")) continue;
      
      // Добавляем название в список импортированных (нормализованное для сравнения)
      importedProductNames.add(name.toLowerCase());
      
      const price = parseNumber(r[IDX_PRICE]) ?? 0;
      const catNameRaw = (r[IDX_CATEGORY] || "").toString().trim();
      const stock = Math.max(0, Math.floor(parseNumber(r[IDX_STOCK]) ?? 0));

      // создаём/ищем основную категорию (только для новых товаров)
      let categoryId: string | undefined = undefined;
      if (catNameRaw) {
        const cat = await prisma.category.upsert({ where: { name: catNameRaw }, create: { name: catNameRaw }, update: {} });
        categoryId = cat.id;
      }

      const existing = await prisma.product.findFirst({ where: { name } });
      if (existing) {
        // Для существующих товаров обновляем остаток, дату импорта и категорию
        await prisma.product.update({ 
          where: { id: existing.id }, 
          data: { 
            stock, 
            lastImportedAt: new Date(),
            categoryId: categoryId || undefined, // Обновляем категорию, если указана в Excel
          } 
        });
        updated++;
      } else {
        await prisma.product.create({ data: { name, price, stock, categoryId, lastImportedAt: new Date() } });
        created++;
      }
    }
  }

  // Исключаем товары, которых нет в Excel файле
  let excluded = 0;
  try {
    // Получаем все товары с langameId (которые могут синхронизироваться)
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

    // Получаем текущие настройки Langame
    let langameSettings = await prisma.langameSettings.findFirst();
    const currentExcludedIds = langameSettings?.excludedProductIds || [];

    // Находим товары, которых нет в импортированном списке
    const productsToExclude = allProductsWithLangame.filter(
      (product) => !importedProductNames.has(product.name.toLowerCase())
    );

    if (productsToExclude.length > 0) {
      // Собираем langameId товаров для исключения
      const langameIdsToExclude = productsToExclude
        .map((p) => p.langameId)
        .filter((id): id is number => id !== null && !currentExcludedIds.includes(id));

      if (langameIdsToExclude.length > 0) {
        // Объединяем с существующими исключениями
        const updatedExcludedIds = [...currentExcludedIds, ...langameIdsToExclude];

        // Обновляем настройки
        if (!langameSettings) {
          // Создаем настройки, если их нет
          langameSettings = await prisma.langameSettings.create({
            data: {
              excludedProductIds: updatedExcludedIds,
            },
          });
        } else {
          await prisma.langameSettings.update({
            where: { id: langameSettings.id },
            data: {
              excludedProductIds: updatedExcludedIds,
            },
          });
        }

        excluded = langameIdsToExclude.length;
      }
    }
  } catch (error: any) {
    // Игнорируем ошибки при исключении товаров (не критично)
    console.error("Error excluding products:", error);
  }

  return NextResponse.json({ created, updated, excluded });
}


