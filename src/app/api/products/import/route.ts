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
      // Для существующих товаров обновляем только остаток и дату импорта
      await prisma.product.update({ where: { id: existing.id }, data: { stock, lastImportedAt: new Date() } });
      updated++;
    } else {
      await prisma.product.create({ data: { name, price, stock, categoryId, lastImportedAt: new Date() } });
      created++;
    }
  }
  }

  return NextResponse.json({ created, updated });
}


