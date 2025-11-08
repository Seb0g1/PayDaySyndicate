import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/guards";

export async function POST(req: Request) {
  const forbidden = await requireAdmin();
  if (forbidden) return forbidden;
  const { items } = await req.json();
  if (!Array.isArray(items)) return new NextResponse("items[] required", { status: 400 });
  let created = 0; let updated = 0;
  for (const it of items) {
    if (!it?.name) continue;
    const data: any = { name: String(it.name), price: Number(it.price || 0) };
    if (it.categoryId) data.categoryId = it.categoryId;
    if (it.subcategory !== undefined) data.subcategory = String(it.subcategory);
    if (it.category !== undefined) data.category = String(it.category);
    if (!it.categoryId && it.mainCategory) {
      const cat = await prisma.category.upsert({ where: { name: String(it.mainCategory) }, create: { name: String(it.mainCategory) }, update: {} });
      data.categoryId = cat.id;
    }
    const existing = await prisma.product.findFirst({ where: { name: data.name } });
    if (existing) { await prisma.product.update({ where: { id: existing.id }, data }); updated++; }
    else { await prisma.product.create({ data }); created++; }
  }
  return NextResponse.json({ created, updated });
}


