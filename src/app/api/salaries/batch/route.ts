import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/guards";
import { NextResponse } from "next/server";
import { z } from "zod";

export async function POST(req: Request) {
  const forbidden = await requireAdmin();
  if (forbidden) return forbidden;
  const schema = z.object({ start: z.string(), end: z.string() });
  const { start, end } = schema.parse(await req.json());
  const startDate = new Date(start);
  const endDate = new Date(end);
  const employees = await prisma.employee.findMany();
  const batch = await prisma.salaryBatch.create({ data: { startDate, endDate, status: "DRAFT", createdBy: "system" } });
  for (const e of employees) {
    const shifts = await prisma.shift.findMany({ where: { employeeId: e.id, date: { gte: startDate, lte: endDate } } });
    const totalHours = shifts.reduce((acc: number, s: any) => acc + s.hours, 0);
    const totalShifts = shifts.length;
    const gross = e.payUnit === "HOURLY" ? Number(e.payRate) * totalHours : Number(e.payRate) * totalShifts;
    const debts = await prisma.debt.findMany({ where: { employeeId: e.id, date: { gte: startDate, lte: endDate } } });
    const debtAmount = debts.reduce((acc: number, d: any) => acc + Number(d.amount), 0);
    // Используем прямой SQL запрос для обхода проблем с отсутствующими колонками
    const shortages = await prisma.$queryRaw`
      SELECT 
        "countSystem",
        "countActual",
        price
      FROM "Shortage"
      WHERE "assignedToEmployeeId" = ${e.id}
        AND "createdAt" >= ${startDate}::TIMESTAMP
        AND "createdAt" <= ${endDate}::TIMESTAMP
    ` as any[];
    const shortageAmt = (shortages || []).reduce((acc: number, s: any) => acc + Number(s.price) * Math.max(0, s.countSystem - s.countActual), 0);
    const net = gross - debtAmount - shortageAmt;
    await prisma.salaryLine.create({ data: { batchId: batch.id, employeeId: e.id, grossAmount: gross, debtAmount, shortageAmt, netAmount: net } });
  }
  return NextResponse.json(batch);
}

export async function PATCH(req: Request) {
  const forbidden = await requireAdmin();
  if (forbidden) return forbidden;
  const schema = z.object({ batchId: z.string(), action: z.enum(["FINALIZE"]) });
  const { batchId, action } = schema.parse(await req.json());
  if (action === "FINALIZE") {
    const updated = await prisma.salaryBatch.update({ where: { id: batchId }, data: { status: "FINALIZED" } });
    return NextResponse.json(updated);
  }
  return NextResponse.json({ ok: true });
}


