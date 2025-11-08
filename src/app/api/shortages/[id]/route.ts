import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/guards";
import { NextResponse } from "next/server";
import { z } from "zod";

export async function DELETE(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const forbidden = await requireAdmin();
  if (forbidden) return forbidden;
  const { id } = await ctx.params;
  await prisma.shortage.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const forbidden = await requireAdmin();
  if (forbidden) return forbidden;
  const body = await req.json();
  const schema = z.object({
    productNameActual: z.string().optional(),
    countSystem: z.number().int().nonnegative().optional(),
    countActual: z.number().int().nonnegative().optional(),
    price: z.number().positive().optional(),
    suggestedReplacement: z.any().optional(),
    resolved: z.boolean().optional(),
    assignedToEmployeeId: z.string().optional().nullable(),
    excludedFromSalary: z.boolean().optional(),
  });
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { id } = await ctx.params;
  const updated = await prisma.shortage.update({ where: { id }, data: parsed.data as any });
  return NextResponse.json(updated);
}


