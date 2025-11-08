import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUserInfo } from "@/lib/permissions";

export async function GET() {
  try {
    const session = await getAuth();
    const userId = ((session as any)?.user as any)?.id;
    
    if (!userId) {
      console.warn("[API /me] No userId found in session");
      return new NextResponse("Unauthorized", { status: 401 });
    }
    
    // Получаем информацию о пользователе с кастомной ролью
    let userInfo;
    try {
      userInfo = await getUserInfo();
    } catch (error: any) {
      console.error("[API /me] Error getting user info:", error);
      // Fallback на старый способ, если getUserInfo не сработал
    }
    
    if (!userInfo) {
      // Fallback на старый способ, если getUserInfo не сработал
      try {
        const user = await prisma.user.findUnique({ where: { id: userId }, include: { employee: true } });
        return NextResponse.json({ 
          id: user?.id, 
          role: user?.role, 
          employeeId: user?.employeeId, 
          employee: user?.employee 
        });
      } catch (error: any) {
        console.error("[API /me] Error fetching user from database:", error);
        return NextResponse.json(
          { error: "Failed to fetch user information" },
          { status: 500 }
        );
      }
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
  } catch (error: any) {
    console.error("[API /me] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


