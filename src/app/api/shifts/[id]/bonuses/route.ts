import { prisma } from "@/lib/prisma";
import { requireDirector } from "@/lib/guards";
import { NextResponse } from "next/server";
import { z } from "zod";

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const items = await prisma.shiftBonus.findMany({ where: { shiftId: id }, orderBy: { createdAt: "desc" } });
  return NextResponse.json(items);
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const forbidden = await requireDirector();
  if (forbidden) return forbidden;
  const { id } = await ctx.params;
  const body = await req.json();
  const parsed = z.object({ amount: z.number().positive(), reason: z.string().min(1) }).safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const created = await prisma.shiftBonus.create({ data: { shiftId: id, amount: parsed.data.amount, reason: parsed.data.reason } });
  return NextResponse.json(created, { status: 201 });
}


