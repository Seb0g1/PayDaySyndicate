import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/guards";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({ name: z.string().min(1), price: z.number().positive(), category: z.string().optional(), categoryId: z.string().optional() });

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const categoryId = searchParams.get("categoryId")?.trim() || undefined;
  const sort = searchParams.get("sort") || "name"; // name | price
  const dir = (searchParams.get("dir") || "asc").toLowerCase() === "desc" ? "desc" : "asc";

  const where: any = {};
  if (categoryId) where.categoryId = categoryId;
  if (q) where.name = { contains: q, mode: "insensitive" };

  const orderBy: any = sort === "price" ? { price: dir } : { name: dir };
  const products = await prisma.product.findMany({ where, orderBy, include: { categoryRef: true } });
  return NextResponse.json(products);
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


