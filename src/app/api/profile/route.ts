import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import bcrypt from "bcryptjs";

const updateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  password: z.string().min(6).optional(),
  phone: z.string().optional(),
  paymentMethod: z.enum(["SBP", "BANK_CARD"]).optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
  phoneNumber: z.string().optional(),
  cardNumber: z.string().optional(),
  bankName: z.string().optional(),
});

export async function GET() {
  try {
    const session = await getAuth();
    const userId = ((session as any)?.user as any)?.id;
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });
    
    // Используем прямой SQL запрос для обхода проблем с отсутствующими колонками
    const users = await prisma.$queryRaw`
      SELECT 
        u.id,
        u.name,
        u.email,
        u.role,
        u."employeeId",
        e.id as "employeeIdFromTable",
        e.name as "employeeName"
      FROM "User" u
      LEFT JOIN "Employee" e ON e.id = u."employeeId"
      WHERE u.id = ${userId}
      LIMIT 1;
    ` as any[];
    
    if (!users || users.length === 0) {
      return new NextResponse("Not found", { status: 404 });
    }
    
    const user = users[0];
    
    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      employeeId: user.employeeId,
      employee: user.employeeId ? {
        id: user.employeeId,
        name: user.employeeName,
      } : null,
    });
  } catch (error: any) {
    console.error("GET profile error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const session = await getAuth();
  const userId = ((session as any)?.user as any)?.id;
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });
  
  const body = await req.json();
  const parsed = updateProfileSchema.safeParse(body);
  
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  
  const data = parsed.data as any;
  
  // Обновляем пользователя
  const userUpdates: any = {};
  if (data.name !== undefined) userUpdates.name = data.name;
  if (data.password !== undefined) {
    userUpdates.password = await bcrypt.hash(data.password, 10);
  }
  
  await prisma.user.update({
    where: { id: userId },
    data: userUpdates,
  });
  
  // Обновляем сотрудника, если есть employeeId
  const user = await prisma.user.findUnique({ where: { id: userId } });
  
  if (user?.employeeId) {
    const employeeUpdates: any = {};
    if (data.phone !== undefined) employeeUpdates.phone = data.phone;
    if (data.paymentMethod !== undefined) employeeUpdates.paymentMethod = data.paymentMethod;
    if (data.phoneNumber !== undefined) employeeUpdates.phoneNumber = data.phoneNumber;
    if (data.cardNumber !== undefined) employeeUpdates.cardNumber = data.cardNumber;
    if (data.bankName !== undefined) employeeUpdates.bankName = data.bankName;
    
    await prisma.employee.update({
      where: { id: user.employeeId },
      data: employeeUpdates,
    });
  }
  
  return NextResponse.json({ message: "Profile updated" });
}

