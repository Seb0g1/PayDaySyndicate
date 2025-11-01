import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";

type SeedUser = { name: string; password: string; role: "DIRECTOR" | "SENIOR_ADMIN" | "ADMIN" };

export async function POST(req: Request) {
  const secret = process.env.ADMIN_SETUP_SECRET;
  const header = req.headers.get("x-setup-secret") || "";
  if (!secret || header !== secret) return new NextResponse("Forbidden", { status: 403 });

  const defaults: SeedUser[] = [
    { name: "Адам", password: "CGJ-Ge-90", role: "DIRECTOR" },
    { name: "Данил", password: "CGJ-Ge-90", role: "DIRECTOR" },
    { name: "Максим", password: "123456789", role: "SENIOR_ADMIN" },
    { name: "Диана", password: "123456789", role: "ADMIN" },
    { name: "Павел", password: "123456789", role: "ADMIN" },
    { name: "Сэни", password: "123456789", role: "ADMIN" },
    { name: "Глеб", password: "123456789", role: "ADMIN" },
  ];

  const body = await req.json().catch(() => null);
  const users: SeedUser[] = Array.isArray(body?.users) ? body.users : defaults;

  const results: { name: string; action: "created" | "updated" }[] = [];
  for (const u of users) {
    const existing = await prisma.user.findFirst({ where: { name: u.name } });
    const passwordHash = await hash(u.password, 10);
    if (existing) {
      await prisma.user.update({ where: { id: existing.id }, data: { role: u.role, password: passwordHash, name: u.name } });
      // ensure employee exists and linked
      let employeeId = existing.employeeId;
      if (!employeeId) {
        const emp = await prisma.employee.create({ data: { name: u.name, hireDate: new Date(), payRate: 0, payUnit: "DAILY", role: "OTHER" } as any });
        await prisma.user.update({ where: { id: existing.id }, data: { employeeId: emp.id } });
      }
      results.push({ name: u.name, action: "updated" });
    } else {
      const emp = await prisma.employee.create({ data: { name: u.name, hireDate: new Date(), payRate: 0, payUnit: "DAILY", role: "OTHER" } as any });
      await prisma.user.create({ data: { name: u.name, role: u.role, password: passwordHash, employeeId: emp.id } });
      results.push({ name: u.name, action: "created" });
    }
  }

  return NextResponse.json({ ok: true, results });
}


