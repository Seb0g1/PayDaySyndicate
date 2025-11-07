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
  const session = await getAuth();
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });
  
  const user = await prisma.user.findUnique({
    where: { id: (session.user as any).id },
    include: { employee: true },
  });
  
  if (!user) return new NextResponse("Not found", { status: 404 });
  
  return NextResponse.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    employee: user.employee,
  });
}

export async function PATCH(req: Request) {
  const session = await getAuth();
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });
  
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
    where: { id: (session.user as any).id },
    data: userUpdates,
  });
  
  // Обновляем сотрудника, если есть employeeId
  const userId = (session.user as any).id;
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

