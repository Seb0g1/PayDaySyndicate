import { prisma } from "@/lib/prisma";
import { getAuth } from "@/lib/auth";

/**
 * Проверяет, имеет ли пользователь право на выполнение действия
 * @param page - Страница (например: "debts", "employees")
 * @param action - Действие (например: "view", "create", "edit", "delete")
 * @param scope - Область действия: "all" для всех записей, "own" для своих
 * @returns true если право предоставлено, false иначе
 */
export async function checkPermission(
  page: string,
  action: string,
  scope: "all" | "own" = "all"
): Promise<boolean> {
  try {
    const session = await getAuth();
    const userId = (((session as any)?.user as any)?.id ?? "") as string;
    const userRole = (((session as any)?.user as any)?.role ?? "EMPLOYEE") as string;

    // Системные роли с полным доступом
    if (userRole === "DIRECTOR" || userRole === "OWNER") {
      return true;
    }

    // Получаем пользователя с кастомной ролью
    const users = await prisma.$queryRaw`
      SELECT 
        u.id,
        u.role as "userRole",
        e."customRoleId",
        r.name as "customRoleName"
      FROM "User" u
      LEFT JOIN "Employee" e ON e.id = u."employeeId"
      LEFT JOIN "Role" r ON r.id = e."customRoleId"
      WHERE u.id = ${userId}
      LIMIT 1;
    ` as any[];

    if (!users || users.length === 0) {
      return false;
    }

    const user = users[0];

    // Если есть кастомная роль, проверяем её права
    if (user.customRoleId) {
      const permissions = await prisma.$queryRaw`
        SELECT page, action, scope, granted
        FROM "RolePermission"
        WHERE "roleId" = ${user.customRoleId}
        AND page = ${page}
        AND action = ${action}
        AND granted = true
        LIMIT 1;
      ` as any[];

      if (permissions && permissions.length > 0) {
        const permission = permissions[0];
        // Если scope = "all", разрешаем для всех
        if (permission.scope === "all") {
          return true;
        }
        // Если scope = "own", разрешаем только для своих записей
        if (permission.scope === "own" && scope === "own") {
          return true;
        }
      }
    }

    return false;
  } catch (error: any) {
    console.error("Permission check error:", error);
    return false;
  }
}

/**
 * Получает информацию о пользователе, включая кастомную роль
 */
export async function getUserInfo() {
  try {
    const session = await getAuth();
    const userId = (((session as any)?.user as any)?.id ?? "") as string;

    if (!userId) {
      return null;
    }

    const users = await prisma.$queryRaw`
      SELECT 
        u.id,
        u.name as "userName",
        u.email,
        u.role as "userRole",
        u."employeeId",
        e.name as "employeeName",
        e."customRoleId",
        r.name as "customRoleName",
        r."nameRu" as "customRoleNameRu"
      FROM "User" u
      LEFT JOIN "Employee" e ON e.id = u."employeeId"
      LEFT JOIN "Role" r ON r.id = e."customRoleId"
      WHERE u.id = ${userId}
      LIMIT 1;
    ` as any[];

    if (users && users.length > 0) {
      const user = users[0];
      // Если пользователь связан с сотрудником, используем имя сотрудника, иначе имя пользователя
      return {
        ...user,
        name: user.employeeName || user.userName || "Администратор",
      };
    }

    return null;
  } catch (error: any) {
    console.error("Get user info error:", error);
    return null;
  }
}

