import { prisma } from "@/lib/prisma";
import { requireDirector } from "@/lib/guards";
import { NextResponse } from "next/server";

export async function DELETE(_: Request, ctx: { params: Promise<{ pid: string }> }) {
  const forbidden = await requireDirector();
  if (forbidden) return forbidden;
  const { pid } = await ctx.params;
  await prisma.shiftPenalty.delete({ where: { id: pid } });
  return new NextResponse(null, { status: 204 });
}


