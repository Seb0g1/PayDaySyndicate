import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getAuth();
  const userId = ((session as any)?.user as any)?.id;
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { employee: true } });
  return NextResponse.json({ id: user?.id, role: user?.role, employeeId: user?.employeeId, employee: user?.employee });
}


