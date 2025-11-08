import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserInfo } from "@/lib/permissions";

export async function GET() {
  const session = await getAuth();
  const userId = ((session as any)?.user as any)?.id;
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });
  
  // Получаем информацию о пользователе с кастомной ролью
  const userInfo = await getUserInfo();
  
  if (!userInfo) {
    // Fallback на старый способ, если getUserInfo не сработал
    const user = await prisma.user.findUnique({ where: { id: userId }, include: { employee: true } });
    return NextResponse.json({ 
      id: user?.id, 
      role: user?.role, 
      employeeId: user?.employeeId, 
      employee: user?.employee 
    });
  }
  
  return NextResponse.json({
    id: userInfo.id,
    role: userInfo.userRole,
    employeeId: userInfo.employeeId,
    customRole: userInfo.customRoleId ? {
      id: userInfo.customRoleId,
      name: userInfo.customRoleName,
      nameRu: userInfo.customRoleNameRu,
    } : null,
    employee: userInfo.employeeId ? {
      id: userInfo.employeeId,
    } : null,
  });
}


