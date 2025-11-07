import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/guards";
import { NextResponse } from "next/server";
import { z } from "zod";

const employeeSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
  phone: z.string().optional(),
  telegramTag: z.string().optional(),
  hireDate: z.string().optional(),
  payRate: z.number().positive().optional(),
  payUnit: z.enum(["HOURLY", "DAILY"]).optional(),
  role: z.enum(["CASHIER", "MANAGER", "STOCKER", "OTHER"]).optional(),
  paymentMethod: z.enum(["SBP", "BANK_CARD"]).optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
  phoneNumber: z.string().optional(),
  cardNumber: z.string().optional(),
  bankName: z.string().optional(),
});

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const employee = await prisma.employee.findUnique({ where: { id } });
  if (!employee) return new NextResponse("Not found", { status: 404 });
  return NextResponse.json(employee);
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const forbidden = await requireAdmin();
  if (forbidden) return forbidden;
  const body = await req.json();
  const parsed = employeeSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const data = parsed.data as any;
  if (data.hireDate) data.hireDate = new Date(data.hireDate);
  const { id } = await ctx.params;
  const updated = await prisma.employee.update({ where: { id }, data });
  return NextResponse.json(updated);
}

export async function DELETE(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const forbidden = await requireAdmin();
  if (forbidden) return forbidden;
  const { id } = await ctx.params;
  await prisma.employee.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}


