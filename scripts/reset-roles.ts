import { PrismaClient } from "../src/generated/prisma/client";
import { config } from "dotenv";
import { resolve } from "path";

const envPath = resolve(process.cwd(), ".env");
config({ path: envPath });

const prisma = new PrismaClient();

async function main() {
  try {
    console.log("Сброс всех ролей...");
    
    // Проверяем и удаляем все права ролей (если таблица существует)
    try {
      await prisma.$executeRaw`
        DELETE FROM "RolePermission";
      `;
      console.log("✓ Все права ролей удалены");
    } catch (error: any) {
      if (error.message?.includes("не существует") || error.code === "P2010" || error.code === "42P01") {
        console.log("⚠ Таблица RolePermission не существует, пропускаем");
      } else {
        throw error;
      }
    }
    
    // Проверяем и удаляем все роли (если таблица существует)
    try {
      await prisma.$executeRaw`
        DELETE FROM "Role";
      `;
      console.log("✓ Все роли удалены");
    } catch (error: any) {
      if (error.message?.includes("не существует") || error.code === "P2010" || error.code === "42P01") {
        console.log("⚠ Таблица Role не существует, пропускаем");
      } else {
        throw error;
      }
    }
    
    // Обнуляем customRoleId у всех пользователей (если колонка существует)
    try {
      await prisma.$executeRaw`
        UPDATE "User" SET "customRoleId" = NULL WHERE "customRoleId" IS NOT NULL;
      `;
      console.log("✓ customRoleId у пользователей обнулен");
    } catch (error: any) {
      if (error.message?.includes("не существует") || error.code === "P2010" || error.code === "42P01") {
        console.log("⚠ Колонка customRoleId у User не существует, пропускаем");
      } else {
        throw error;
      }
    }
    
    // Обнуляем customRoleId у всех сотрудников (если колонка существует)
    try {
      await prisma.$executeRaw`
        UPDATE "Employee" SET "customRoleId" = NULL WHERE "customRoleId" IS NOT NULL;
      `;
      console.log("✓ customRoleId у сотрудников обнулен");
    } catch (error: any) {
      if (error.message?.includes("не существует") || error.code === "P2010" || error.code === "42P01") {
        console.log("⚠ Колонка customRoleId у Employee не существует, пропускаем");
      } else {
        throw error;
      }
    }
    
    console.log("\n✅ Все роли сброшены!");
  } catch (error: any) {
    console.error("❌ Ошибка при сбросе ролей:", error.message);
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

