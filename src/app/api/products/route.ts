import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/guards";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({ name: z.string().min(1), price: z.number().positive(), category: z.string().optional(), categoryId: z.string().optional() });

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim();
    const categoryId = searchParams.get("categoryId")?.trim() || undefined;
    const sort = searchParams.get("sort") || "name"; // name | price
    const dir = (searchParams.get("dir") || "asc").toLowerCase() === "desc" ? "desc" : "asc";
    const stockFilter = searchParams.get("stockFilter") || "all";
    const includeHidden = searchParams.get("includeHidden") === "true";

    // Строим SQL запрос
    let query = `
      SELECT 
        p.id,
        p.name,
        p.price,
        p.stock,
        p."isHidden",
        p."categoryId",
        p."langameId",
        p."lastImportedAt",
        p."subcategory",
        p."category",
        c.name as "categoryName"
      FROM "Product" p
      LEFT JOIN "Category" c ON c.id = p."categoryId"
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    // Фильтр по категории
    if (categoryId) {
      query += ` AND p."categoryId" = $${paramIndex}`;
      params.push(categoryId);
      paramIndex++;
    }

    // Фильтр по поиску
    if (q) {
      query += ` AND LOWER(p.name) LIKE $${paramIndex}`;
      params.push(`%${q.toLowerCase()}%`);
      paramIndex++;
    }

    // Фильтр по скрытым товарам
    if (!includeHidden) {
      query += ` AND p."isHidden" = false`;
    }

    // Фильтр по остаткам
    if (stockFilter !== "all") {
      switch (stockFilter) {
        case "out":
          query += ` AND p.stock = 0`;
          break;
        case "low":
          query += ` AND p.stock >= 1 AND p.stock <= 5`;
          break;
        case "medium":
          query += ` AND p.stock >= 6 AND p.stock <= 15`;
          break;
        case "high":
          query += ` AND p.stock >= 16`;
          break;
      }
    }

    // Сортировка
    const sortColumn = sort === "price" ? "p.price" : "p.name";
    query += ` ORDER BY ${sortColumn} ${dir.toUpperCase()}`;

    // Выполняем запрос
    let products = await prisma.$queryRawUnsafe(query, ...params) as any[];

    // Специальное логирование для товара ID 883 - проверяем до фильтрации исключений
    const burritoBeforeFilter = products.find((p: any) => p.langameId === 883);
    if (!burritoBeforeFilter) {
      // Проверяем, существует ли товар в базе данных
      const burritoInDb = await prisma.product.findUnique({
        where: { langameId: 883 },
        select: {
          id: true,
          name: true,
          langameId: true,
          isHidden: true,
          stock: true,
          categoryId: true,
        },
      });
      if (burritoInDb) {
        console.log(`[API /products] === BURRITO PRODUCT (ID 883) FILTERED BY SQL QUERY ===`);
        console.log(`[API /products] Product in DB:`, burritoInDb);
        console.log(`[API /products] Query filters:`, {
          q,
          categoryId,
          includeHidden,
          stockFilter,
        });
        console.log(`[API /products] SQL query:`, query);
        console.log(`[API /products] SQL params:`, params);
        
        // Проверяем, почему товар не попал в результаты
        if (!includeHidden && burritoInDb.isHidden) {
          console.log(`[API /products] === BURRITO PRODUCT (ID 883) IS HIDDEN ===`);
        }
        if (stockFilter !== "all") {
          console.log(`[API /products] === BURRITO PRODUCT (ID 883) MAY BE FILTERED BY STOCK ===`);
          console.log(`[API /products] Product stock: ${burritoInDb.stock}, Filter: ${stockFilter}`);
        }
        if (categoryId && burritoInDb.categoryId !== categoryId) {
          console.log(`[API /products] === BURRITO PRODUCT (ID 883) FILTERED BY CATEGORY ===`);
          console.log(`[API /products] Product categoryId: ${burritoInDb.categoryId}, Filter: ${categoryId}`);
        }
        if (q) {
          console.log(`[API /products] === BURRITO PRODUCT (ID 883) MAY BE FILTERED BY SEARCH ===`);
          console.log(`[API /products] Product name: ${burritoInDb.name}, Search: ${q}`);
        }
      } else {
        console.log(`[API /products] === BURRITO PRODUCT (ID 883) NOT FOUND IN DB ===`);
      }
    } else {
      console.log(`[API /products] === BURRITO PRODUCT (ID 883) FOUND IN SQL QUERY ===`);
      console.log(`[API /products] Product data:`, {
        id: burritoBeforeFilter.id,
        name: burritoBeforeFilter.name,
        langameId: burritoBeforeFilter.langameId,
        isHidden: burritoBeforeFilter.isHidden,
        stock: burritoBeforeFilter.stock,
      });
    }

    // Получаем список исключенных ID товаров из LangameSettings
    let excludedIds: number[] = [];
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
          excludedIds = langameSettings.excludedProductIds;
        }
      }
    } catch (error) {
      // Игнорируем ошибки при получении настроек
      console.warn("Error checking LangameSettings:", error);
    }

    // Фильтруем исключенные товары
    if (excludedIds.length > 0) {
      const beforeFilter = products.length;
      products = products.filter((p: any) => !p.langameId || !excludedIds.includes(p.langameId));
      const afterFilter = products.length;
      if (beforeFilter !== afterFilter) {
        console.log(`[API /products] Filtered out ${beforeFilter - afterFilter} excluded products`);
      }
      
      // Специальное логирование для товара ID 883
      const burritoProduct = products.find((p: any) => p.langameId === 883);
      if (!burritoProduct) {
        // Проверяем, был ли товар отфильтрован
        const allProducts = await prisma.$queryRawUnsafe(query, ...params) as any[];
        const burritoInAll = allProducts.find((p: any) => p.langameId === 883);
        if (burritoInAll) {
          console.log(`[API /products] === BURRITO PRODUCT (ID 883) FILTERED OUT ===`);
          console.log(`[API /products] Product data:`, {
            id: burritoInAll.id,
            name: burritoInAll.name,
            langameId: burritoInAll.langameId,
            isHidden: burritoInAll.isHidden,
            excludedIds: excludedIds,
            isExcluded: excludedIds.includes(883),
          });
        } else {
          console.log(`[API /products] === BURRITO PRODUCT (ID 883) NOT FOUND IN QUERY ===`);
          // Проверяем, существует ли товар в базе данных
          const burritoInDb = await prisma.product.findUnique({
            where: { langameId: 883 },
            select: {
              id: true,
              name: true,
              langameId: true,
              isHidden: true,
              stock: true,
            },
          });
          if (burritoInDb) {
            console.log(`[API /products] === BURRITO PRODUCT (ID 883) EXISTS IN DB ===`);
            console.log(`[API /products] Product data:`, burritoInDb);
            console.log(`[API /products] Query filters:`, {
              q,
              categoryId,
              includeHidden,
              stockFilter,
            });
          } else {
            console.log(`[API /products] === BURRITO PRODUCT (ID 883) NOT FOUND IN DB ===`);
          }
        }
      } else {
        console.log(`[API /products] === BURRITO PRODUCT (ID 883) FOUND IN RESULTS ===`);
        console.log(`[API /products] Product data:`, {
          id: burritoProduct.id,
          name: burritoProduct.name,
          langameId: burritoProduct.langameId,
          isHidden: burritoProduct.isHidden,
        });
      }
    }

    // Форматируем результат для клиента
    const formatted = (products || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      price: Number(p.price) || 0,
      stock: Number(p.stock) || 0,
      isHidden: p.isHidden || false,
      categoryId: p.categoryId || null,
      langameId: p.langameId || null,
      lastImportedAt: p.lastImportedAt || null,
      subcategory: p.subcategory || null,
      categoryRef: p.categoryName ? { name: p.categoryName } : null,
      // category - это подкатегория/тег, независимое поле, НЕ копия названия категории
      category: p.category || null,
    }));

    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error("Error fetching products:", error);
    // Возвращаем пустой массив вместо ошибки
    return NextResponse.json([]);
  }
}

export async function POST(req: Request) {
  const forbidden = await requireAdmin();
  if (forbidden) return forbidden;
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const created = await prisma.product.create({ data: parsed.data });
  return NextResponse.json(created, { status: 201 });
}


