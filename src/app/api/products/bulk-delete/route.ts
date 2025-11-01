import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/guards";

export async function POST(req: Request) {
  const forbidden = await requireAdmin();
  if (forbidden) return forbidden;
  const { ids } = await req.json();
  if (!Array.isArray(ids)) return new NextResponse("ids[] required", { status: 400 });
  let deleted = 0; const failed: string[] = [];
  for (const id of ids as string[]) {
    try {
      const deps = await prisma.debt.count({ where: { productId: id } });
      if (deps > 0) { failed.push(id); continue; }
      await prisma.product.delete({ where: { id } });
      deleted++;
    } catch {
      failed.push(id);
    }
  }
  return NextResponse.json({ deleted, failed });
}


