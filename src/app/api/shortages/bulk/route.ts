import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/guards";
import { NextResponse } from "next/server";
import { z } from "zod";

const itemSchema = z.object({
  productNameSystem: z.string().min(1),
  productNameActual: z.string().optional(),
  countSystem: z.number().int().nonnegative(),
  countActual: z.number().int().nonnegative(),
  price: z.number().positive(),
  suggestedReplacement: z.any().optional(),
  assignedToEmployeeId: z.string().optional(),
});

export async function POST(req: Request) {
  const forbidden = await requireAdmin();
  if (forbidden) return forbidden;

  const body = await req.json();
  const arr = Array.isArray(body) ? body : [];
  const parsed = z.array(itemSchema).safeParse(arr);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const data = parsed.data.map((i) => ({
    productNameSystem: i.productNameSystem,
    productNameActual: i.productNameActual ?? null,
    countSystem: i.countSystem,
    countActual: i.countActual,
    price: i.price,
    suggestedReplacement: i.suggestedReplacement ?? undefined,
    assignedToEmployeeId: i.assignedToEmployeeId ?? null,
  }));

  // createMany не возвращает созданные записи — нам достаточно статистики
  const res = await prisma.shortage.createMany({ data });
  return NextResponse.json({ count: res.count });
}


