import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/guards";

export async function DELETE(_: Request, ctx: { params: Promise<{ name: string }> }) {
  const forbidden = await requireAdmin();
  if (forbidden) return forbidden;
  const { name } = await ctx.params;
  const decoded = decodeURIComponent(name);
  const res = await prisma.product.updateMany({ where: { category: decoded }, data: { category: null } });
  return NextResponse.json({ cleared: res.count });
}


