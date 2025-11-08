import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/guards";
import { NextResponse } from "next/server";
import { z } from "zod";

const employeeSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
  phone: z.string().optional(),
  telegramTag: z.string().optional(),
  hireDate: z.string(),
  payRate: z.number().positive(),
  payUnit: z.enum(["HOURLY", "DAILY"]).default("DAILY"),
  userRole: z.enum(["DIRECTOR"]).optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
  customRoleId: z.string().optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.toLowerCase() ?? "";
    
    // Используем прямой SQL запрос для обхода проблем с отсутствующими колонками
    let query = `
      SELECT 
        e.*, 
        u.id as "userId", 
        u.role as "userRole",
        r.id as "customRoleId",
        r."nameRu" as "customRoleNameRu"
      FROM "Employee" e
      LEFT JOIN "User" u ON u."employeeId" = e.id
      LEFT JOIN "Role" r ON r.id = e."customRoleId"
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;
    
    if (q) {
      query += ` AND (LOWER(e.name) LIKE $${paramIndex} OR LOWER(e.email) LIKE $${paramIndex})`;
      params.push(`%${q}%`);
      paramIndex++;
    }
    
    query += ` ORDER BY e.name ASC;`;
    
    const employees = await prisma.$queryRawUnsafe(query, ...params) as any[];
    
    // Форматируем результат для клиента
    const formatted = (employees || []).map((emp: any) => ({
      ...emp,
      user: emp.userId ? {
        id: emp.userId,
        role: emp.userRole,
      } : null,
      userRole: emp.userRole || null,
      customRole: emp.customRoleId ? {
        id: emp.customRoleId,
        nameRu: emp.customRoleNameRu,
      } : null,
    }));
    
    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error("GET employees error:", error);
    // Если таблица не существует, возвращаем пустой массив
    if (error.message?.includes("does not exist") || error.code === "P2021") {
      return NextResponse.json([]);
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const forbidden = await requireAdmin();
  if (forbidden) return forbidden;
  const body = await req.json();
  const parsed = employeeSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { name, email, phone, telegramTag, hireDate, payRate, payUnit, userRole, customRoleId } = parsed.data;
  
  // Используем прямой SQL запрос для создания сотрудника
  const result = await prisma.$queryRaw`
    INSERT INTO "Employee" (
      id, name, email, phone, "telegramTag", "hireDate", "payRate", "payUnit", role, "userRole", "customRoleId", "createdAt", "updatedAt"
    )
    VALUES (
      gen_random_uuid()::TEXT,
      ${name},
      ${email || null},
      ${phone || null},
      ${telegramTag || null},
      ${new Date(hireDate)}::TIMESTAMP,
      ${payRate}::DECIMAL(10, 2),
      ${payUnit}::"PayRateUnit",
      'OTHER'::"EmployeeRole",
      ${userRole || null}::"UserRole",
      ${customRoleId || null},
      NOW(),
      NOW()
    )
    RETURNING *;
  ` as any[];
  
  if (!result || result.length === 0) {
    return NextResponse.json({ error: "Не удалось создать сотрудника" }, { status: 500 });
  }
  
  return NextResponse.json(result[0], { status: 201 });
}


