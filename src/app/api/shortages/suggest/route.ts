import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import Fuse from "fuse.js";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const price = Number(searchParams.get("price") ?? "0");
  const tolerance = Number(searchParams.get("tolerance") ?? "0.1"); // 10%
  const category = searchParams.get("category") ?? undefined;
  const products = await prisma.product.findMany({ where: category ? { category } : {} });
  const fuse = new Fuse(products, { keys: ["name"], threshold: 0.3, includeScore: true });
  const results = fuse.search(q).map((r) => r.item);
  const filtered = results.filter((p: any) => {
    if (!price || !p.price) return true;
    const base = Number(p.price);
    const lower = base * (1 - tolerance);
    const upper = base * (1 + tolerance);
    return price >= lower && price <= upper;
  });
  return NextResponse.json(filtered.slice(0, 10));
}


