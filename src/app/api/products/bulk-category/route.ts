import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/guards";

export async function POST(req: Request) {
  const forbidden = await requireAdmin();
  if (forbidden) return forbidden;
  const { ids, categoryId } = await req.json();
  if (!Array.isArray(ids)) return new NextResponse("ids[] required", { status: 400 });
  
  const data: any = { categoryId: categoryId || null };
  const res = await prisma.product.updateMany({ 
    where: { id: { in: ids as string[] } }, 
    data 
  });
  
  return NextResponse.json({ updated: res.count });
}

