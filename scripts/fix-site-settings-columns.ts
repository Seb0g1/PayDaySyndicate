import { PrismaClient } from "../src/generated/prisma/client";
import { config } from "dotenv";
import { resolve } from "path";

const envPath = resolve(process.cwd(), ".env");
config({ path: envPath });

const prisma = new PrismaClient();

async function main() {
  try {
    console.log("Проверка и добавление недостающих колонок в SiteSettings...");
    
    // Проверяем и добавляем siteIcon
    try {
      await prisma.$executeRaw`
        ALTER TABLE "SiteSettings" ADD COLUMN IF NOT EXISTS "siteIcon" TEXT DEFAULT 'PS';
      `;
      console.log("✓ Колонка siteIcon добавлена или уже существует");
    } catch (error: any) {
      if (error.message?.includes("уже существует") || error.code === "42701") {
        console.log("✓ Колонка siteIcon уже существует");
      } else {
        console.error("❌ Ошибка при добавлении siteIcon:", error.message);
      }
    }
    
    // Проверяем и добавляем payslipShowStamp
    try {
      await prisma.$executeRaw`
        ALTER TABLE "SiteSettings" ADD COLUMN IF NOT EXISTS "payslipShowStamp" BOOLEAN DEFAULT true;
      `;
      console.log("✓ Колонка payslipShowStamp добавлена или уже существует");
    } catch (error: any) {
      if (error.message?.includes("уже существует") || error.code === "42701") {
        console.log("✓ Колонка payslipShowStamp уже существует");
      } else {
        console.error("❌ Ошибка при добавлении payslipShowStamp:", error.message);
      }
    }
    
    // Проверяем и добавляем payslipBorderColor
    try {
      await prisma.$executeRaw`
        ALTER TABLE "SiteSettings" ADD COLUMN IF NOT EXISTS "payslipBorderColor" TEXT DEFAULT '#000000';
      `;
      console.log("✓ Колонка payslipBorderColor добавлена или уже существует");
    } catch (error: any) {
      if (error.message?.includes("уже существует") || error.code === "42701") {
        console.log("✓ Колонка payslipBorderColor уже существует");
      } else {
        console.error("❌ Ошибка при добавлении payslipBorderColor:", error.message);
      }
    }
    
    // Проверяем и добавляем payslipWatermark
    try {
      await prisma.$executeRaw`
        ALTER TABLE "SiteSettings" ADD COLUMN IF NOT EXISTS "payslipWatermark" TEXT;
      `;
      console.log("✓ Колонка payslipWatermark добавлена или уже существует");
    } catch (error: any) {
      if (error.message?.includes("уже существует") || error.code === "42701") {
        console.log("✓ Колонка payslipWatermark уже существует");
      } else {
        console.error("❌ Ошибка при добавлении payslipWatermark:", error.message);
      }
    }
    
    // Проверяем и добавляем payslipStampImage
    try {
      await prisma.$executeRaw`
        ALTER TABLE "SiteSettings" ADD COLUMN IF NOT EXISTS "payslipStampImage" TEXT;
      `;
      console.log("✓ Колонка payslipStampImage добавлена или уже существует");
    } catch (error: any) {
      if (error.message?.includes("уже существует") || error.code === "42701") {
        console.log("✓ Колонка payslipStampImage уже существует");
      } else {
        console.error("❌ Ошибка при добавлении payslipStampImage:", error.message);
      }
    }
    
    console.log("\n✅ Все колонки проверены!");
  } catch (error: any) {
    console.error("❌ Ошибка:", error.message);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

