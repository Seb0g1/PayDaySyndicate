import { PrismaClient } from "../src/generated/prisma/client";
import { hash } from "bcryptjs";
import { config } from "dotenv";
import { join } from "path";
import { resolve } from "path";

// Загружаем переменные окружения
const envPath = resolve(process.cwd(), ".env");
config({ path: envPath });

const prisma = new PrismaClient();

const users = [
  { name: "Данил", password: "CGJ-Ge-90", role: "DIRECTOR" as const },
  { name: "Адам", password: "CGJ-Ge-90", role: "DIRECTOR" as const },
  { name: "Максим", password: "123456789", role: "SENIOR_ADMIN" as const },
  { name: "Сэни", password: "123456789", role: "ADMIN" as const },
  { name: "Глеб", password: "123456789", role: "ADMIN" as const },
  { name: "Диана", password: "123456789", role: "ADMIN" as const },
  { name: "Паша", password: "123456789", role: "ADMIN" as const },
];

async function main() {
  console.log("Создание пользователей...");

  for (const userData of users) {
    try {
      const passwordHash = await hash(userData.password, 10);
      
      // Используем прямой SQL запрос для обхода проблем с отсутствующими колонками
      const existing = await prisma.$queryRaw`
        SELECT id, name, email, role FROM "User" WHERE name = ${userData.name} LIMIT 1;
      ` as any[];

      if (existing && existing.length > 0) {
        // Обновляем существующего пользователя
        await prisma.$executeRaw`
          UPDATE "User"
          SET 
            password = ${passwordHash},
            role = ${userData.role}::"UserRole",
            "updatedAt" = NOW()
          WHERE name = ${userData.name};
        `;

        console.log(`✓ Обновлен: ${userData.name} (${userData.role})`);
      } else {
        // Создаем нового пользователя
        const email = `${userData.name.toLowerCase().replace(/\s+/g, '')}@admin.local`;
        
        await prisma.$executeRaw`
          INSERT INTO "User" (id, name, email, password, role, "createdAt", "updatedAt")
          VALUES (
            gen_random_uuid()::TEXT,
            ${userData.name},
            ${email},
            ${passwordHash},
            ${userData.role}::"UserRole",
            NOW(),
            NOW()
          );
        `;

        console.log(`✓ Создан: ${userData.name} (${userData.role})`);
      }
    } catch (error: any) {
      console.error(`❌ Ошибка при создании пользователя ${userData.name}:`, error.message);
    }
  }

  console.log("\nВсе пользователи созданы/обновлены!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

