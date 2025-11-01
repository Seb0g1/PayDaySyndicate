import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const rows = await prisma.product.findMany({
    where: { category: { not: null } },
    select: { category: true },
    distinct: ["category"],
    orderBy: { category: "asc" },
  });
  const categories = rows.map((r) => r.category).filter(Boolean);
  return NextResponse.json(categories);
}


