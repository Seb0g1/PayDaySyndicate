import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/guards";
import { NextResponse } from "next/server";
import { z } from "zod";

const employeeSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
  phone: z.string().optional(),
  hireDate: z.string(),
  payRate: z.number().positive(),
  payUnit: z.enum(["HOURLY", "DAILY"]).default("DAILY"),
  role: z.enum(["CASHIER", "MANAGER", "STOCKER", "OTHER"]).default("OTHER"),
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.toLowerCase() ?? "";
  const role = searchParams.get("role") ?? undefined;
  const employees = await prisma.employee.findMany({
    where: {
      AND: [
        q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { email: { contains: q, mode: "insensitive" } },
              ],
            }
          : {},
        role ? { role: role as any } : {},
      ],
    },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(employees);
}

export async function POST(req: Request) {
  const forbidden = await requireAdmin();
  if (forbidden) return forbidden;
  const body = await req.json();
  const parsed = employeeSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { name, email, phone, hireDate, payRate, payUnit, role } = parsed.data;
  const created = await prisma.employee.create({
    data: {
      name,
      email,
      phone,
      hireDate: new Date(hireDate),
      payRate,
      payUnit,
      role,
    },
  });
  return NextResponse.json(created, { status: 201 });
}


