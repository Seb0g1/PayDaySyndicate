import { prisma } from "@/lib/prisma";
import { requireDirector } from "@/lib/guards";
import { NextResponse } from "next/server";

export async function DELETE(_: Request, ctx: { params: Promise<{ bid: string }> }) {
  const forbidden = await requireDirector();
  if (forbidden) return forbidden;
  const { bid } = await ctx.params;
  await prisma.shiftBonus.delete({ where: { id: bid } });
  return new NextResponse(null, { status: 204 });
}


