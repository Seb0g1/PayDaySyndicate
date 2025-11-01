import { prisma } from "@/lib/prisma";
import { requireDirector } from "@/lib/guards";
import { NextResponse } from "next/server";

export async function DELETE(_: Request, ctx: { params: Promise<{ hid: string }> }) {
  const forbidden = await requireDirector();
  if (forbidden) return forbidden;
  const { hid } = await ctx.params;
  await prisma.shiftHookah.delete({ where: { id: hid } });
  return new NextResponse(null, { status: 204 });
}


