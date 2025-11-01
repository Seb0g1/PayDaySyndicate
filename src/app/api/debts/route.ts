import { prisma } from "@/lib/prisma";
import { getAuth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { z } from "zod";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get("employeeId") ?? undefined;
  const productId = searchParams.get("productId") ?? undefined;
  const where: any = {};
  if (employeeId) where.employeeId = employeeId;
  if (productId) where.productId = productId;
  const debts = await prisma.debt.findMany({ where, include: { product: true, employee: true }, orderBy: { date: "desc" } });
  return NextResponse.json(debts);
}

const schema = z.object({ employeeId: z.string(), productId: z.string(), quantity: z.number().int().positive(), date: z.string() });

export async function POST(req: Request) {
  const session = await getAuth();
  const role = (((session as any)?.user as any)?.role ?? "EMPLOYEE") as string;
  const userId = (((session as any)?.user as any)?.id ?? "") as string;
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { employeeId, productId, quantity, date } = parsed.data;
  if (role !== "DIRECTOR") {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.employeeId || user.employeeId !== employeeId) {
      return new NextResponse("Forbidden", { status: 403 });
    }
  }
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return new NextResponse("Product not found", { status: 404 });
  const amount = product.price.mul(quantity);
  const created = await prisma.debt.create({ data: { employeeId, productId, quantity, date: new Date(date), amount } });
  return NextResponse.json(created, { status: 201 });
}


