import { PrismaClient } from "../src/generated/prisma/client";
import { config } from "dotenv";
import { resolve } from "path";

const envPath = resolve(process.cwd(), ".env");
config({ path: envPath });

const prisma = new PrismaClient();

async function main() {
  try {
    console.log("Удаление всех кастомных ролей...");

    // Получаем все кастомные роли (не системные)
    const customRoles = await prisma.$queryRaw`
      SELECT id, name, "nameRu" FROM "Role" WHERE "isSystem" = false;
    ` as any[];

    if (!customRoles || customRoles.length === 0) {
      console.log("✓ Кастомные роли не найдены");
    } else {
      console.log(`Найдено ${customRoles.length} кастомных ролей:`);
      for (const role of customRoles) {
        console.log(`  - ${role.nameRu} (${role.name})`);
      }

      // Удаляем права всех кастомных ролей
      for (const role of customRoles) {
        try {
          await prisma.$executeRaw`
            DELETE FROM "RolePermission" WHERE "roleId" = ${role.id};
          `;
          console.log(`  ✓ Права для ${role.nameRu} удалены`);
        } catch (error: any) {
          console.warn(`  ⚠ Не удалось удалить права для ${role.nameRu}:`, error.message);
        }
      }

      // Обнуляем customRoleId у всех пользователей и сотрудников
      try {
        await prisma.$executeRaw`
          UPDATE "User" SET "customRoleId" = NULL WHERE "customRoleId" IS NOT NULL;
        `;
        console.log("✓ customRoleId у пользователей обнулен");
      } catch (error: any) {
        console.warn("⚠ Не удалось обнулить customRoleId у пользователей:", error.message);
      }

      try {
        await prisma.$executeRaw`
          UPDATE "Employee" SET "customRoleId" = NULL WHERE "customRoleId" IS NOT NULL;
        `;
        console.log("✓ customRoleId у сотрудников обнулен");
      } catch (error: any) {
        console.warn("⚠ Не удалось обнулить customRoleId у сотрудников:", error.message);
      }

      // Удаляем кастомные роли
      for (const role of customRoles) {
        try {
          await prisma.$executeRaw`
            DELETE FROM "Role" WHERE id = ${role.id};
          `;
          console.log(`  ✓ Роль ${role.nameRu} удалена`);
        } catch (error: any) {
          console.error(`  ❌ Не удалось удалить роль ${role.nameRu}:`, error.message);
        }
      }
    }

    console.log("\n✅ Все кастомные роли удалены!");
  } catch (error: any) {
    console.error("❌ Ошибка при удалении кастомных ролей:", error.message);
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

