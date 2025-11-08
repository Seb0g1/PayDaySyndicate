import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/guards";
import { NextResponse } from "next/server";
import { z } from "zod";

const employeeSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
  phone: z.string().optional(),
  telegramTag: z.string().optional(),
  hireDate: z.string().optional(),
  payRate: z.number().positive().optional(),
  payUnit: z.enum(["HOURLY", "DAILY"]).optional(),
  userRole: z.enum(["DIRECTOR"]).optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
  customRoleId: z.string().optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
  paymentMethod: z.enum(["SBP", "BANK_CARD"]).optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
  phoneNumber: z.string().optional(),
  cardNumber: z.string().optional(),
  bankName: z.string().optional(),
});

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    
    // Используем прямой SQL запрос для обхода проблем с отсутствующими колонками
    const employees = await prisma.$queryRaw`
      SELECT 
        e.*,
        u.id as "userId",
        u.role as "userRole",
        r.id as "customRoleId",
        r."nameRu" as "customRoleNameRu"
      FROM "Employee" e
      LEFT JOIN "User" u ON u."employeeId" = e.id
      LEFT JOIN "Role" r ON r.id = e."customRoleId"
      WHERE e.id = ${id}
      LIMIT 1;
    ` as any[];
    
    if (!employees || employees.length === 0) {
      return new NextResponse("Not found", { status: 404 });
    }
    
    const employee = employees[0];
    
    // Получаем права сотрудника (если таблица существует)
    let permissions: any[] = [];
    try {
      permissions = await prisma.$queryRaw`
        SELECT * FROM "EmployeePermission" WHERE "employeeId" = ${id};
      ` as any[];
    } catch (error) {
      // Таблица может не существовать
      permissions = [];
    }
    
    // Получаем связанного пользователя (если есть)
    let user: any = null;
    if (employee.userId) {
      try {
        const users = await prisma.$queryRaw`
          SELECT id, role FROM "User" WHERE id = ${employee.userId} LIMIT 1;
        ` as any[];
        if (users && users.length > 0) {
          user = users[0];
        }
      } catch (error) {
        // Игнорируем ошибку
      }
    }
    
    return NextResponse.json({
      ...employee,
      permissions: permissions || [],
      user: user,
      customRole: employee.customRoleId ? {
        id: employee.customRoleId,
        nameRu: employee.customRoleNameRu,
      } : null,
    });
  } catch (error: any) {
    console.error("GET employee error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const forbidden = await requireAdmin();
    if (forbidden) return forbidden;
    const body = await req.json();
    const parsed = employeeSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    const data = parsed.data as any;
    if (data.hireDate) data.hireDate = new Date(data.hireDate);
    const { id } = await ctx.params;
    
    // Обновляем роль пользователя, если есть связанный пользователь
    if (data.userRole !== undefined) {
      // Ищем пользователя по employeeId
      try {
        const users = await prisma.$queryRaw`
          SELECT id FROM "User" WHERE "employeeId" = ${id} LIMIT 1;
        ` as any[];
        
        if (users && users.length > 0 && users[0].id) {
          await prisma.$executeRaw`
            UPDATE "User" SET role = ${data.userRole}::"UserRole" WHERE id = ${users[0].id};
          `;
        }
      } catch (error: any) {
        // Игнорируем ошибку, если колонка employeeId не существует
        console.warn("Не удалось обновить роль пользователя:", error.message);
      }
      delete data.userRole; // Удаляем из данных для обновления сотрудника
    }
    
    // Обновляем сотрудника используя прямой SQL
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    
    if (data.name !== undefined) {
      updateFields.push(`name = $${updateValues.length + 1}`);
      updateValues.push(data.name);
    }
    if (data.email !== undefined) {
      updateFields.push(`email = $${updateValues.length + 1}`);
      updateValues.push(data.email);
    }
    if (data.phone !== undefined) {
      updateFields.push(`phone = $${updateValues.length + 1}`);
      updateValues.push(data.phone);
    }
    if (data.telegramTag !== undefined) {
      updateFields.push(`"telegramTag" = $${updateValues.length + 1}`);
      updateValues.push(data.telegramTag);
    }
    if (data.hireDate !== undefined) {
      updateFields.push(`"hireDate" = $${updateValues.length + 1}`);
      updateValues.push(data.hireDate);
    }
    if (data.payRate !== undefined) {
      updateFields.push(`"payRate" = $${updateValues.length + 1}::DECIMAL(10, 2)`);
      updateValues.push(data.payRate);
    }
    if (data.payUnit !== undefined) {
      updateFields.push(`"payUnit" = $${updateValues.length + 1}::"PayRateUnit"`);
      updateValues.push(data.payUnit);
    }
    // role (EmployeeRole) не обновляется через API, используется значение по умолчанию
    if (data.paymentMethod !== undefined) {
      updateFields.push(`"paymentMethod" = $${updateValues.length + 1}::"PaymentMethod"`);
      updateValues.push(data.paymentMethod);
    }
    if (data.phoneNumber !== undefined) {
      updateFields.push(`"phoneNumber" = $${updateValues.length + 1}`);
      updateValues.push(data.phoneNumber);
    }
    if (data.cardNumber !== undefined) {
      updateFields.push(`"cardNumber" = $${updateValues.length + 1}`);
      updateValues.push(data.cardNumber);
    }
    if (data.bankName !== undefined) {
      updateFields.push(`"bankName" = $${updateValues.length + 1}`);
      updateValues.push(data.bankName);
    }
    if (data.customRoleId !== undefined) {
      updateFields.push(`"customRoleId" = $${updateValues.length + 1}`);
      updateValues.push(data.customRoleId || null);
    }
    
    if (updateFields.length > 0) {
      // Формируем SET clause с правильными параметрами
      const setClause = updateFields.join(', ');
      
      await prisma.$executeRawUnsafe(
        `UPDATE "Employee" SET ${setClause}, "updatedAt" = NOW() WHERE id = $${updateValues.length + 1};`,
        ...updateValues,
        id
      );
    }
    
    // Получаем обновленного сотрудника с кастомной ролью
    const updatedEmployees = await prisma.$queryRaw`
      SELECT 
        e.*,
        u.id as "userId",
        u.role as "userRole",
        r.id as "customRoleId",
        r."nameRu" as "customRoleNameRu"
      FROM "Employee" e
      LEFT JOIN "User" u ON u."employeeId" = e.id
      LEFT JOIN "Role" r ON r.id = e."customRoleId"
      WHERE e.id = ${id}
      LIMIT 1;
    ` as any[];
    
    if (!updatedEmployees || updatedEmployees.length === 0) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }
    
    const updated = updatedEmployees[0];
    
    // Получаем права сотрудника
    let permissions: any[] = [];
    try {
      permissions = await prisma.$queryRaw`
        SELECT * FROM "EmployeePermission" WHERE "employeeId" = ${id};
      ` as any[];
    } catch (error) {
      permissions = [];
    }
    
    // Получаем связанного пользователя
    let user: any = null;
    if (updated.userId) {
      try {
        const users = await prisma.$queryRaw`
          SELECT id, role FROM "User" WHERE id = ${updated.userId} LIMIT 1;
        ` as any[];
        if (users && users.length > 0) {
          user = users[0];
        }
      } catch (error) {
        // Игнорируем ошибку
      }
    }
    
    return NextResponse.json({
      ...updated,
      permissions: permissions || [],
      user: user,
      customRole: updated.customRoleId ? {
        id: updated.customRoleId,
        nameRu: updated.customRoleNameRu,
      } : null,
    });
  } catch (error: any) {
    console.error("PATCH employee error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const forbidden = await requireAdmin();
  if (forbidden) return forbidden;
  const { id } = await ctx.params;
  await prisma.employee.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}


