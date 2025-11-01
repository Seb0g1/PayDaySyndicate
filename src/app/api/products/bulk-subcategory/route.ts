import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/guards";

export async function POST(req: Request) {
  const forbidden = await requireAdmin();
  if (forbidden) return forbidden;
  const { ids, category } = await req.json();
  if (!Array.isArray(ids)) return new NextResponse("ids[] required", { status: 400 });
  const res = await prisma.product.updateMany({ where: { id: { in: ids as string[] } }, data: { category: category ?? null } });
  return NextResponse.json({ updated: res.count });
}


