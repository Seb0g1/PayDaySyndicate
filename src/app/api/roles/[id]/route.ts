import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireDirector } from "@/lib/guards";
import { z } from "zod";

const updateRoleSchema = z.object({
  name: z.string().min(1).optional(),
  nameRu: z.string().min(1).optional(),
  description: z.string().optional(),
});

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    
    // Используем прямой SQL запрос
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
      WHERE r.id = ${id}
      GROUP BY r.id, r.name, r."nameRu", r.description, r."isSystem", r."createdAt", r."updatedAt";
    ` as any[];

    if (!roles || roles.length === 0) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    const role = roles[0];
    
    // Получаем права для роли
    const permissions = await prisma.$queryRaw`
      SELECT id, "roleId", page, action, scope, granted, "createdAt", "updatedAt"
      FROM "RolePermission"
      WHERE "roleId" = ${id}
      ORDER BY page ASC, action ASC;
    ` as any[];

    // Преобразуем BigInt в Number для сериализации
    const userCount = typeof role.user_count === 'bigint' ? Number(role.user_count) : Number(role.user_count || 0);
    const employeeCount = typeof role.employee_count === 'bigint' ? Number(role.employee_count) : Number(role.employee_count || 0);
    
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
        users: userCount,
        employees: employeeCount,
      },
    });
  } catch (error: any) {
    console.error("GET role error:", error);
    if (error.message?.includes("does not exist") || error.code === "P2021") {
      return NextResponse.json(
        { error: "Role not found", hint: "Примените миграции: npx prisma migrate deploy" },
        { status: 404 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const forbidden = await requireDirector();
    if (forbidden) return forbidden;

    const { id } = await ctx.params;
    const body = await req.json();
    const parsed = updateRoleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const roles = await prisma.$queryRaw`
      SELECT id, "isSystem" FROM "Role" WHERE id = ${id} LIMIT 1;
    ` as any[];

    if (!roles || roles.length === 0) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    const role = roles[0];
    if (role.isSystem) {
      return NextResponse.json({ error: "Cannot modify system role" }, { status: 403 });
    }

    // Обновляем роль
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    
    if (parsed.data.name !== undefined) {
      updateFields.push('name');
      updateValues.push(parsed.data.name);
    }
    if (parsed.data.nameRu !== undefined) {
      updateFields.push('"nameRu"');
      updateValues.push(parsed.data.nameRu);
    }
    if (parsed.data.description !== undefined) {
      updateFields.push('description');
      updateValues.push(parsed.data.description);
    }
    
    if (updateFields.length > 0) {
      const setClause = updateFields.map((field, index) => `${field} = $${index + 1}`).join(', ');
      await prisma.$executeRawUnsafe(
        `UPDATE "Role" SET ${setClause}, "updatedAt" = NOW() WHERE id = $${updateFields.length + 1};`,
        ...updateValues,
        id
      );
    }
    
    // Получаем обновленную роль
    const updatedRoles = await prisma.$queryRaw`
      SELECT * FROM "Role" WHERE id = ${id} LIMIT 1;
    ` as any[];
    
    const updated = updatedRoles[0];
    
    // Получаем права
    const permissions = await prisma.$queryRaw`
      SELECT * FROM "RolePermission" WHERE "roleId" = ${id};
    ` as any[];

    return NextResponse.json({
      id: String(updated.id),
      name: String(updated.name),
      nameRu: String(updated.nameRu),
      description: updated.description ? String(updated.description) : null,
      isSystem: Boolean(updated.isSystem),
      createdAt: updated.createdAt ? new Date(updated.createdAt).toISOString() : null,
      updatedAt: updated.updatedAt ? new Date(updated.updatedAt).toISOString() : null,
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
    });
  } catch (error: any) {
    console.error("PATCH role error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(_: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const forbidden = await requireDirector();
    if (forbidden) return forbidden;

    const { id } = await ctx.params;
    const roles = await prisma.$queryRaw`
      SELECT id, "isSystem" FROM "Role" WHERE id = ${id} LIMIT 1;
    ` as any[];

    if (!roles || roles.length === 0) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    const role = roles[0];
    if (role.isSystem) {
      return NextResponse.json({ error: "Cannot delete system role" }, { status: 403 });
    }

    await prisma.$executeRaw`
      DELETE FROM "Role" WHERE id = ${id};
    `;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE role error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

