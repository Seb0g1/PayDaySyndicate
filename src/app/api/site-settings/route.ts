import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireDirector } from "@/lib/guards";
import { z } from "zod";

export async function GET() {
  try {
    // Используем прямой SQL запрос для обхода проблем с отсутствующими колонками
    const settings = await prisma.$queryRaw`
      SELECT * FROM "SiteSettings" WHERE id = 'default' LIMIT 1;
    ` as any[];

    if (!settings || settings.length === 0) {
      // Создаем настройки по умолчанию
      await prisma.$executeRaw`
        INSERT INTO "SiteSettings" (
          id, "siteName", "siteIcon", theme, 
          "payslipShowStamp", "payslipBorderColor",
          "createdAt", "updatedAt"
        )
        VALUES (
          'default',
          'PayDay Syndicate',
          'PS',
          'dark',
          true,
          '#000000',
          NOW(),
          NOW()
        )
        ON CONFLICT (id) DO NOTHING;
      `;
      
      // Получаем созданные настройки
      const newSettings = await prisma.$queryRaw`
        SELECT * FROM "SiteSettings" WHERE id = 'default' LIMIT 1;
      ` as any[];
      
      return NextResponse.json(newSettings[0] || {
        id: "default",
        siteName: "PayDay Syndicate",
        siteIcon: "PS",
        theme: "dark",
        payslipShowStamp: true,
        payslipBorderColor: "#000000",
      });
    }

    return NextResponse.json(settings[0]);
  } catch (error: any) {
    console.error("GET site-settings error:", error);
    
    // Если таблица SiteSettings не существует или отсутствуют колонки
    if (error.message?.includes("does not exist") || error.code === "P2021") {
      // Возвращаем настройки по умолчанию
      return NextResponse.json({
        id: "default",
        siteName: "PayDay Syndicate",
        siteIcon: "PS",
        theme: "dark",
        payslipShowStamp: true,
        payslipBorderColor: "#000000",
        payslipWatermark: null,
        payslipStampImage: null,
      });
    }
    
    return NextResponse.json(
      { 
        error: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

const updateSchema = z.object({
  siteName: z.string().min(1).optional(),
  siteIcon: z.string().optional(),
  theme: z.enum(["dark", "light", "blue", "purple", "green"]).optional(),
  enableEmployees: z.boolean().optional(),
  enableShifts: z.boolean().optional(),
  enableProducts: z.boolean().optional(),
  enableDebts: z.boolean().optional(),
  enableShortages: z.boolean().optional(),
  enableSalaries: z.boolean().optional(),
  enableReports: z.boolean().optional(),
  enableTasks: z.boolean().optional(),
  enableChecklist: z.boolean().optional(),
  enableLostItems: z.boolean().optional(),
  enableMemos: z.boolean().optional(),
  enablePayments: z.boolean().optional(),
  enablePcManagement: z.boolean().optional(),
  enableProductOrder: z.boolean().optional(),
  enableLangame: z.boolean().optional(),
  enableTelegram: z.boolean().optional(),
  // Настройки расчетного листа
  payslipShowStamp: z.boolean().optional(),
  payslipBorderColor: z.string().optional(),
  payslipWatermark: z.string().optional().nullable(),
  payslipStampImage: z.string().optional().nullable(),
});

export async function PATCH(req: Request) {
  try {
    const forbidden = await requireDirector();
    if (forbidden) return forbidden;

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    // Используем прямой SQL запрос для обхода проблем с отсутствующими колонками
    const existing = await prisma.$queryRaw`
      SELECT id FROM "SiteSettings" WHERE id = 'default' LIMIT 1;
    ` as any[];

    if (!existing || existing.length === 0) {
      // Создаем настройки по умолчанию
      const data = parsed.data;
      await prisma.$executeRaw`
        INSERT INTO "SiteSettings" (
          id, "siteName", "siteIcon", theme,
          "payslipShowStamp", "payslipBorderColor", "payslipWatermark", "payslipStampImage",
          "createdAt", "updatedAt"
        )
        VALUES (
          'default',
          ${data.siteName || 'PayDay Syndicate'},
          ${data.siteIcon || 'PS'},
          ${data.theme || 'dark'},
          ${data.payslipShowStamp ?? true},
          ${data.payslipBorderColor || '#000000'},
          ${data.payslipWatermark || null},
          ${data.payslipStampImage || null},
          NOW(),
          NOW()
        );
      `;
    } else {
      // Обновляем существующие настройки
      const data = parsed.data;
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      
      if (data.siteName !== undefined) {
        updateFields.push('"siteName"');
        updateValues.push(data.siteName);
      }
      if (data.siteIcon !== undefined) {
        updateFields.push('"siteIcon"');
        updateValues.push(data.siteIcon);
      }
      if (data.theme !== undefined) {
        updateFields.push('theme');
        updateValues.push(data.theme);
      }
      if (data.payslipShowStamp !== undefined) {
        updateFields.push('"payslipShowStamp"');
        updateValues.push(data.payslipShowStamp);
      }
      if (data.payslipBorderColor !== undefined) {
        updateFields.push('"payslipBorderColor"');
        updateValues.push(data.payslipBorderColor);
      }
      if (data.payslipWatermark !== undefined) {
        updateFields.push('"payslipWatermark"');
        updateValues.push(data.payslipWatermark);
      }
      if (data.payslipStampImage !== undefined) {
        updateFields.push('"payslipStampImage"');
        updateValues.push(data.payslipStampImage);
      }
      
      // Обновляем все остальные поля features
      const featureFields = [
        'enableEmployees', 'enableShifts', 'enableProducts', 'enableDebts',
        'enableShortages', 'enableSalaries', 'enableReports', 'enableTasks',
        'enableChecklist', 'enableLostItems', 'enableMemos', 'enablePayments',
        'enablePcManagement', 'enableProductOrder', 'enableLangame', 'enableTelegram'
      ];
      
      for (const field of featureFields) {
        const value = (data as any)[field];
        if (value !== undefined) {
          updateFields.push(`"${field}"`);
          updateValues.push(value);
        }
      }
      
      if (updateFields.length > 0) {
        // Проверяем существование колонок перед обновлением
        const validFields: string[] = [];
        const validValues: any[] = [];
        
        for (let i = 0; i < updateFields.length; i++) {
          const field = updateFields[i];
          const value = updateValues[i];
          
          // Проверяем существование колонки
          try {
            await prisma.$queryRawUnsafe(
              `SELECT ${field} FROM "SiteSettings" WHERE id = 'default' LIMIT 1;`
            );
            validFields.push(field);
            validValues.push(value);
          } catch (error: any) {
            // Колонка не существует, пропускаем
            console.warn(`Колонка ${field} не существует, пропускаем обновление`);
          }
        }
        
        if (validFields.length > 0) {
          const setClause = validFields.map((field, index) => `${field} = $${index + 1}`).join(', ');
          await prisma.$executeRawUnsafe(
            `UPDATE "SiteSettings" SET ${setClause}, "updatedAt" = NOW() WHERE id = 'default';`,
            ...validValues
          );
        }
      }
    }
    
    // Получаем обновленные настройки
    const settings = await prisma.$queryRaw`
      SELECT * FROM "SiteSettings" WHERE id = 'default' LIMIT 1;
    ` as any[];

    return NextResponse.json(settings);
  } catch (error: any) {
    console.error("PATCH site-settings error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

