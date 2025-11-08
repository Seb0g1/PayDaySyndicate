import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireDirector } from "@/lib/guards";
import { z } from "zod";

const roleSchema = z.object({
  name: z.string().min(1),
  nameRu: z.string().min(1),
  description: z.string().optional(),
});

export async function GET() {
  try {
    // Используем прямой SQL запрос для обхода проблем с отсутствующими таблицами
    const roles = await prisma.$queryRaw`
      SELECT 
        r.id,
        r.name,
        r."nameRu",
        r.description,
        r."isSystem",
        r."createdAt",
        r."updatedAt",
        COUNT(DISTINCT u.id) as user_count,
        COUNT(DISTINCT e.id) as employee_count
      FROM "Role" r
      LEFT JOIN "User" u ON u."customRoleId" = r.id
      LEFT JOIN "Employee" e ON e."customRoleId" = r.id
      GROUP BY r.id, r.name, r."nameRu", r.description, r."isSystem", r."createdAt", r."updatedAt"
      ORDER BY r.name ASC;
    ` as any[];

    // Получаем права для каждой роли
    const rolesWithPermissions = await Promise.all(
      (roles || []).map(async (role: any) => {
        try {
          const permissions = await prisma.$queryRaw`
            SELECT id, "roleId", page, action, scope, granted, "createdAt", "updatedAt"
            FROM "RolePermission"
            WHERE "roleId" = ${role.id}
            ORDER BY page ASC, action ASC;
          ` as any[];
          
          // Преобразуем BigInt в Number для сериализации
          const userCount = typeof role.user_count === 'bigint' ? Number(role.user_count) : Number(role.user_count || 0);
          const employeeCount = typeof role.employee_count === 'bigint' ? Number(role.employee_count) : Number(role.employee_count || 0);
          
          return {
            id: String(role.id),
            name: String(role.name),
            nameRu: String(role.nameRu),
            description: role.description ? String(role.description) : null,
            isSystem: Boolean(role.isSystem),
            createdAt: role.createdAt ? new Date(role.createdAt).toISOString() : null,
            updatedAt: role.updatedAt ? new Date(role.updatedAt).toISOString() : null,
            permissions: (permissions || []).map((p: any) => ({
              id: String(p.id),
              roleId: String(p.roleId),
              page: String(p.page),
              action: String(p.action),
              scope: String(p.scope),
              granted: Boolean(p.granted),
              createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : null,
              updatedAt: p.updatedAt ? new Date(p.updatedAt).toISOString() : null,
            })),
            _count: {
              users: userCount,
              employees: employeeCount,
            },
          };
        } catch (error) {
          // Преобразуем BigInt в Number для сериализации
          const userCount = typeof role.user_count === 'bigint' ? Number(role.user_count) : Number(role.user_count || 0);
          const employeeCount = typeof role.employee_count === 'bigint' ? Number(role.employee_count) : Number(role.employee_count || 0);
          
          return {
            id: String(role.id),
            name: String(role.name),
            nameRu: String(role.nameRu),
            description: role.description ? String(role.description) : null,
            isSystem: Boolean(role.isSystem),
            createdAt: role.createdAt ? new Date(role.createdAt).toISOString() : null,
            updatedAt: role.updatedAt ? new Date(role.updatedAt).toISOString() : null,
            permissions: [],
            _count: {
              users: userCount,
              employees: employeeCount,
            },
          };
        }
      })
    );

    return NextResponse.json(rolesWithPermissions);
  } catch (error: any) {
    // Если таблица Role не существует, возвращаем пустой массив
    if (error.message?.includes("does not exist") || error.code === "P2021") {
      console.warn("Таблица Role не существует. Примените миграции: npx prisma migrate deploy");
      return NextResponse.json([]);
    }
    console.error("GET roles error:", error);
    return NextResponse.json(
      { 
        error: error.message,
        hint: error.message?.includes("does not exist") ? "Примените миграции: npx prisma migrate deploy" : undefined
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const forbidden = await requireDirector();
    if (forbidden) return forbidden;

    const body = await req.json();
    const parsed = roleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    // Используем прямой SQL запрос для создания роли
    let result: any[];
    try {
      result = await prisma.$queryRaw`
        INSERT INTO "Role" (id, name, "nameRu", description, "isSystem", "createdAt", "updatedAt")
        VALUES (
          gen_random_uuid()::TEXT,
          ${parsed.data.name},
          ${parsed.data.nameRu},
          ${parsed.data.description || null},
          false,
          NOW(),
          NOW()
        )
        RETURNING id, name, "nameRu", description, "isSystem", "createdAt", "updatedAt";
      ` as any[];
    } catch (error: any) {
      // Если таблица Role не существует
      if (error.message?.includes("не существует") || error.code === "P2010" || error.code === "42P01") {
        return NextResponse.json(
          { 
            error: "Таблица Role не существует в базе данных",
            hint: "Примените миграции: npx prisma migrate deploy"
          },
          { status: 500 }
        );
      }
      throw error;
    }

    if (!result || result.length === 0) {
      return NextResponse.json({ error: "Не удалось создать роль" }, { status: 500 });
    }

    const role = result[0];
    
    // Получаем права для роли (пустой массив, так как роль только что создана)
    let permissions: any[] = [];
    try {
      permissions = await prisma.$queryRaw`
        SELECT id, "roleId", page, action, scope, granted, "createdAt", "updatedAt"
        FROM "RolePermission"
        WHERE "roleId" = ${role.id};
      ` as any[];
    } catch (error) {
      // Таблица может не существовать
      permissions = [];
    }

    return NextResponse.json({
      id: String(role.id),
      name: String(role.name),
      nameRu: String(role.nameRu),
      description: role.description ? String(role.description) : null,
      isSystem: Boolean(role.isSystem),
      createdAt: role.createdAt ? new Date(role.createdAt).toISOString() : null,
      updatedAt: role.updatedAt ? new Date(role.updatedAt).toISOString() : null,
      permissions: (permissions || []).map((p: any) => ({
        id: String(p.id),
        roleId: String(p.roleId),
        page: String(p.page),
        action: String(p.action),
        scope: String(p.scope),
        granted: Boolean(p.granted),
        createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : null,
        updatedAt: p.updatedAt ? new Date(p.updatedAt).toISOString() : null,
      })),
      _count: {
        users: 0,
        employees: 0,
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error("POST roles error:", error);
    
    // Если таблица Role не существует
    if (error.message?.includes("does not exist") || error.code === "P2021") {
      return NextResponse.json(
        { 
          error: "Таблица Role не существует в базе данных",
          hint: "Примените миграции: npx prisma migrate deploy"
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { 
        error: error.message,
        hint: error.message?.includes("does not exist") ? "Примените миграции: npx prisma migrate deploy" : undefined
      },
      { status: 500 }
    );
  }
}

