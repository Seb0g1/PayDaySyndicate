import { prisma } from "@/lib/prisma";
import { requireDirector } from "@/lib/guards";
import { NextResponse } from "next/server";
import { z } from "zod";

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const items = await prisma.shiftHookah.findMany({ where: { shiftId: id }, orderBy: { createdAt: "desc" } });
  return NextResponse.json(items);
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const forbidden = await requireDirector();
  if (forbidden) return forbidden;
  const { id } = await ctx.params;
  const body = await req.json();
  const parsed = z.object({ qty: z.number().int().positive(), amountPer: z.number().positive().optional() }).safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const created = await prisma.shiftHookah.create({ data: { shiftId: id, qty: parsed.data.qty, amountPer: parsed.data.amountPer ?? 200 } });
  return NextResponse.json(created, { status: 201 });
}


