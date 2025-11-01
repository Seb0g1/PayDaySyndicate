import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/guards";
import { z } from "zod";

export async function GET() {
  const cats = await prisma.category.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(cats);
}

export async function POST(req: Request) {
  const forbidden = await requireAdmin();
  if (forbidden) return forbidden;
  const body = await req.json();
  const parsed = z.object({ name: z.string().min(1), parentId: z.string().optional() }).safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const c = await prisma.category.create({ data: parsed.data });
  return NextResponse.json(c, { status: 201 });
}


