import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/guards";
import { NextResponse } from "next/server";
import { z } from "zod";

export async function DELETE(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const forbidden = await requireAdmin();
  if (forbidden) return forbidden;
  const { id } = await ctx.params;
  await prisma.debt.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const forbidden = await requireAdmin();
  if (forbidden) return forbidden;
  const body = await req.json();
  const schema = z.object({ quantity: z.number().int().positive().optional(), date: z.string().optional() });
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const update: any = parsed.data;
  const { id } = await ctx.params;
  const existing = await prisma.debt.findUnique({ where: { id }, include: { product: true } });
  if (!existing) return new NextResponse("Not found", { status: 404 });
  if (update.quantity) {
    update.amount = existing.product.price.mul(update.quantity);
  }
  if (update.date) update.date = new Date(update.date);
  const updated = await prisma.debt.update({ where: { id }, data: update });
  return NextResponse.json(updated);
}


