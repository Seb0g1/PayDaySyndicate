import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireDirector } from "@/lib/guards";
import { z } from "zod";

const permissionSchema = z.object({
  page: z.string().min(1),
  action: z.string().min(1),
  scope: z.enum(["all", "own", "none"]).default("all"),
  granted: z.boolean().default(true),
});

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const permissions = await prisma.$queryRaw`
      SELECT * FROM "RolePermission"
      WHERE "roleId" = ${id}
      ORDER BY page ASC, action ASC;
    ` as any[];
    
    // Преобразуем все значения для сериализации
    const formatted = (permissions || []).map((p: any) => ({
      id: String(p.id),
      roleId: String(p.roleId),
      page: String(p.page),
      action: String(p.action),
      scope: String(p.scope),
      granted: Boolean(p.granted),
      createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : null,
      updatedAt: p.updatedAt ? new Date(p.updatedAt).toISOString() : null,
    }));
    
    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error("GET role permissions error:", error);
    if (error.message?.includes("does not exist") || error.code === "P2021") {
      return NextResponse.json([]);
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const forbidden = await requireDirector();
    if (forbidden) return forbidden;

    const { id } = await ctx.params;
    const body = await req.json();
    const parsed = permissionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    // Проверяем, существует ли роль
    const roles = await prisma.$queryRaw`
      SELECT id FROM "Role" WHERE id = ${id} LIMIT 1;
    ` as any[];

    if (!roles || roles.length === 0) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    // Создаем или обновляем право
    await prisma.$executeRaw`
      INSERT INTO "RolePermission" (id, "roleId", page, action, scope, granted, "createdAt", "updatedAt")
      VALUES (
        gen_random_uuid()::TEXT,
        ${id},
        ${parsed.data.page},
        ${parsed.data.action},
        ${parsed.data.scope},
        ${parsed.data.granted},
        NOW(),
        NOW()
      )
      ON CONFLICT ("roleId", page, action) DO UPDATE
      SET 
        scope = ${parsed.data.scope},
        granted = ${parsed.data.granted},
        "updatedAt" = NOW();
    `;
    
    // Получаем созданное/обновленное право
    const permissions = await prisma.$queryRaw`
      SELECT * FROM "RolePermission"
      WHERE "roleId" = ${id} AND page = ${parsed.data.page} AND action = ${parsed.data.action}
      LIMIT 1;
    ` as any[];
    
    const permission = permissions[0];

    return NextResponse.json({
      id: String(permission.id),
      roleId: String(permission.roleId),
      page: String(permission.page),
      action: String(permission.action),
      scope: String(permission.scope),
      granted: Boolean(permission.granted),
      createdAt: permission.createdAt ? new Date(permission.createdAt).toISOString() : null,
      updatedAt: permission.updatedAt ? new Date(permission.updatedAt).toISOString() : null,
    });
  } catch (error: any) {
    console.error("POST role permission error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const forbidden = await requireDirector();
    if (forbidden) return forbidden;

    const { id } = await ctx.params;
    const { searchParams } = new URL(req.url);
    const page = searchParams.get("page");
    const action = searchParams.get("action");

    if (!page || !action) {
      return NextResponse.json({ error: "Page and action are required" }, { status: 400 });
    }

    await prisma.$executeRaw`
      DELETE FROM "RolePermission"
      WHERE "roleId" = ${id} AND page = ${page} AND action = ${action};
    `;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE role permission error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

