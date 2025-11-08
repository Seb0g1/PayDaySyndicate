import { PrismaClient } from "../src/generated/prisma/client";
import { config } from "dotenv";
import { resolve } from "path";

const envPath = resolve(process.cwd(), ".env");
config({ path: envPath });

const prisma = new PrismaClient();

async function main() {
  try {
    console.log("Создание системных ролей...");
    
    const systemRoles = [
      {
        name: "DIRECTOR",
        nameRu: "Директор",
        description: "Полный доступ ко всем функциям системы",
        isSystem: true,
      },
      {
        name: "SENIOR_ADMIN",
        nameRu: "Старший администратор",
        description: "Расширенные права администратора",
        isSystem: true,
      },
      {
        name: "ADMIN",
        nameRu: "Администратор",
        description: "Права администратора",
        isSystem: true,
      },
      {
        name: "EMPLOYEE",
        nameRu: "Сотрудник",
        description: "Базовые права сотрудника",
        isSystem: true,
      },
    ];
    
    for (const roleData of systemRoles) {
      try {
        // Проверяем, существует ли роль
        const existing = await prisma.$queryRaw`
          SELECT id FROM "Role" WHERE name = ${roleData.name} LIMIT 1;
        ` as any[];
        
        if (existing && existing.length > 0) {
          console.log(`✓ Роль ${roleData.nameRu} уже существует`);
        } else {
          // Создаем роль
          await prisma.$executeRaw`
            INSERT INTO "Role" (id, name, "nameRu", description, "isSystem", "createdAt", "updatedAt")
            VALUES (
              gen_random_uuid()::TEXT,
              ${roleData.name},
              ${roleData.nameRu},
              ${roleData.description},
              ${roleData.isSystem},
              NOW(),
              NOW()
            );
          `;
          console.log(`✓ Роль ${roleData.nameRu} создана`);
        }
      } catch (error: any) {
        console.error(`❌ Ошибка при создании роли ${roleData.nameRu}:`, error.message);
      }
    }
    
    console.log("\n✅ Все системные роли проверены!");
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

