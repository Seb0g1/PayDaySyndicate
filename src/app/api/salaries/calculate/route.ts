import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const start = new Date(searchParams.get("start") || "");
    const end = new Date(searchParams.get("end") || "");
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
    }
    const session = await getAuth();
    const role = (((session as any)?.user as any)?.role ?? "EMPLOYEE") as string;
    const userId = (((session as any)?.user as any)?.id ?? "") as string;
  const shareParam = role === "DIRECTOR" ? (searchParams.get("share") || "") : "";
  const shareIds = shareParam.split(",").map((s) => s.trim()).filter(Boolean);
  const overrideStr = searchParams.get("override") || "";
  const overrideVal = Number((overrideStr || "").replace(/\s/g, "").replace(",", "."));
  
  // Получаем последний сохраненный пересчет с данными о недостачах
  const latestSavedCount = await prisma.inventoryCountHistory.findFirst({
    where: { status: "SAVED" },
    orderBy: { updatedAt: "desc" },
  });

  let employees = await prisma.employee.findMany({
    select: {
      id: true,
      name: true,
      payRate: true,
      payUnit: true,
      role: true,
    },
  });
  
  if (role !== "DIRECTOR") {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user?.employeeId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const me = await prisma.employee.findUnique({ 
      where: { id: user.employeeId },
      select: {
        id: true,
        name: true,
        payRate: true,
        payUnit: true,
        role: true,
      },
    });
    employees = me ? [me] : [];
  }
  
  // Если нет сотрудников, возвращаем пустой массив
  if (employees.length === 0) {
    return NextResponse.json([]);
  }
  
  const result = [] as any[];

  // Подсчитываем количество смен для каждого сотрудника за период
  const employeeShiftCounts = new Map<string, number>();
  const allShiftsInPeriod = await prisma.shift.findMany({
    where: { date: { gte: start, lte: end }, attended: true },
    select: { employeeId: true },
  });
  allShiftsInPeriod.forEach(shift => {
    employeeShiftCounts.set(shift.employeeId, (employeeShiftCounts.get(shift.employeeId) || 0) + 1);
  });

  // Общая сумма недостач без назначенного сотрудника за период
  let unassignedSum: number = 0;
  let unassignedDetails: { name: string; qty: number; price: number }[] = [];
  if (!Number.isNaN(overrideVal) && overrideStr !== "") {
    unassignedSum = Math.max(0, overrideVal);
  } else {
    // Пытаемся использовать данные из последнего сохраненного пересчета
    if (latestSavedCount && latestSavedCount.data && (latestSavedCount.data as any).__shortageTotalValue) {
      unassignedSum = Number((latestSavedCount.data as any).__shortageTotalValue) || 0;
    } else {
      // Если нет данных в пересчете, берем из недостач без назначенного сотрудника
      const unassigned = await prisma.shortage.findMany({ where: { assignedToEmployeeId: null, createdAt: { gte: start, lte: end } } });
      unassignedSum = unassigned.reduce((acc: number, s: any) => acc + Number(s.price) * Math.max(0, s.countSystem - s.countActual), 0);
      unassignedDetails = unassigned.map((s: any) => ({ name: s.productNameSystem, qty: Math.max(0, s.countSystem - s.countActual), price: Number(s.price) }));
    }
  }
  
  // Используем выбранных сотрудников для деления недостач, если они указаны
  // Иначе используем сотрудников с более чем 4 сменами
  let employeeIdsForSharing: string[] = [];
  if (shareIds.length > 0) {
    // Используем выбранных сотрудников из параметра share
    employeeIdsForSharing = shareIds;
  } else {
    // Фильтруем сотрудников: только те, у кого больше 4 смен
    employeeIdsForSharing = Array.from(employeeShiftCounts.entries())
      .filter(([_, count]) => count > 4)
      .map(([id, _]) => id);
  }
  const divisor = Math.max(1, employeeIdsForSharing.length);

  for (const e of employees) {
    const shifts = await prisma.shift.findMany({ where: { employeeId: e.id, date: { gte: start, lte: end } } });
    const totalHours = shifts.reduce((acc: number, s: any) => acc + s.hours, 0);
    const totalShifts = shifts.length;
    let variable = e.payUnit === "HOURLY" ? Number(e.payRate) * totalHours : Number(e.payRate) * totalShifts;
    // Базовая ставка для управляющего (MANAGER): 7500 за пол-месяца
    // Спец-правило: период 16..конец или 16..1 следующего месяца = 7500
    let baseManager = 0;
    if (e.role === "MANAGER") {
      const sameMonth = start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth();
      const endOfStartMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
      const isFirstHalfExact = sameMonth && start.getDate() === 1 && end.getDate() === 15;
      const isSecondHalfExactSameMonth = sameMonth && start.getDate() === 16 && end.getDate() === endOfStartMonth;
      const isSecondHalfCrossToFirst = !sameMonth && start.getDate() >= 16 && end.getDate() === 1 && (
        (end.getFullYear() === start.getFullYear() && end.getMonth() === start.getMonth() + 1) ||
        (start.getMonth() === 11 && end.getMonth() === 0 && end.getFullYear() === start.getFullYear() + 1)
      );
      if (isFirstHalfExact || isSecondHalfExactSameMonth || isSecondHalfCrossToFirst) {
        baseManager = 7500;
      } else {
        const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        baseManager = days <= 17 ? 7500 : 15000;
      }
    }
    const gross = baseManager + variable;

    const debts = await prisma.debt.findMany({ where: { employeeId: e.id, date: { gte: start, lte: end } }, include: { product: true } });
    const debtAmount = debts.reduce((acc: number, d: any) => acc + Number(d.amount), 0);

    const shortages = await prisma.shortage.findMany({ where: { assignedToEmployeeId: e.id, createdAt: { gte: start, lte: end } } });
    let shortageAmt = shortages.reduce((acc: number, s: any) => acc + Number(s.price) * Math.max(0, s.countSystem - s.countActual), 0);
    // Распределяем недостачи среди выбранных сотрудников
    const unassignedShare = employeeIdsForSharing.includes(e.id) ? unassignedSum / divisor : 0;
    if (unassignedShare > 0) shortageAmt += unassignedShare;

    // Penalties/Bonuses/Hookahs for this employee's shifts
    const shiftIds = shifts.map((s: any) => s.id);
    let penaltySum = 0, bonusSum = 0, hookahSum = 0;
    let penaltiesList: { amount: number; reason: string }[] = [];
    let bonusesList: { amount: number; reason: string }[] = [];
    if (shiftIds.length > 0) {
      const [penalties, bonuses, hookahs] = await Promise.all([
        prisma.shiftPenalty.findMany({ where: { shiftId: { in: shiftIds } } }),
        prisma.shiftBonus.findMany({ where: { shiftId: { in: shiftIds } } }),
        prisma.shiftHookah.findMany({ where: { shiftId: { in: shiftIds } } }),
      ]);
      penaltySum = penalties.reduce((a: number, p: any) => a + Number(p.amount), 0);
      bonusSum = bonuses.reduce((a: number, b: any) => a + Number(b.amount), 0);
      hookahSum = hookahs.reduce((a: number, h: any) => a + Number(h.amountPer) * h.qty, 0);
      penaltiesList = penalties.map((p: any) => ({ amount: Number(p.amount), reason: p.reason }));
      bonusesList = bonuses.map((b: any) => ({ amount: Number(b.amount), reason: b.reason }));
    }

    const net = gross - debtAmount - shortageAmt - penaltySum + bonusSum + hookahSum;
    result.push({
      employee: e,
      totalHours,
      totalShifts,
      gross,
      debtAmount,
      shortageAmt,
      net,
      unassignedShare,
      shifts: shifts.map((s: any) => ({ date: s.date.toISOString(), type: s.type })),
      shortages: shortages.map((s: any) => ({ name: s.productNameSystem, qty: Math.max(0, s.countSystem - s.countActual), price: Number(s.price) })),
      debts: debts.map((d: any) => ({ name: d.product?.name ?? "Товар", qty: d.quantity, price: Number(d.product?.price ?? 0), amount: Number(d.amount) })),
      penalties: penaltySum,
      bonuses: bonusSum,
      penaltiesList,
      bonusesList,
      hookah: hookahSum,
      unassignedDetails,
    });
  }
  return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error calculating salaries:", error);
    return NextResponse.json(
      { error: error.message || "Ошибка при расчете зарплат", details: error.stack },
      { status: 500 }
    );
  }
}


