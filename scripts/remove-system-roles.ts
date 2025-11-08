import { PrismaClient } from "../src/generated/prisma/client";
import { config } from "dotenv";
import { resolve } from "path";

const envPath = resolve(process.cwd(), ".env");
config({ path: envPath });

const prisma = new PrismaClient();

async function main() {
  try {
    console.log("Удаление ненужных системных ролей...");
    
    const rolesToDelete = ["SENIOR_ADMIN", "ADMIN", "EMPLOYEE"];
    
    for (const roleName of rolesToDelete) {
      try {
        // Проверяем, существует ли роль
        const existing = await prisma.$queryRaw`
          SELECT id, name, "isSystem" FROM "Role" WHERE name = ${roleName} LIMIT 1;
        ` as any[];
        
        if (existing && existing.length > 0) {
          const role = existing[0];
          
          // Проверяем, используется ли роль
          const usersWithRole = await prisma.$queryRaw`
            SELECT COUNT(*) as count FROM "User" WHERE "customRoleId" = ${role.id};
          ` as any[];
          
          const employeesWithRole = await prisma.$queryRaw`
            SELECT COUNT(*) as count FROM "Employee" WHERE "customRoleId" = ${role.id};
          ` as any[];
          
          const userCount = Number(usersWithRole[0]?.count || 0);
          const employeeCount = Number(employeesWithRole[0]?.count || 0);
          
          if (userCount > 0 || employeeCount > 0) {
            console.log(`⚠ Роль ${roleName} используется (Пользователей: ${userCount}, Сотрудников: ${employeeCount}). Пропускаем удаление.`);
          } else {
            // Удаляем права роли
            await prisma.$executeRaw`
              DELETE FROM "RolePermission" WHERE "roleId" = ${role.id};
            `;
            
            // Удаляем роль
            await prisma.$executeRaw`
              DELETE FROM "Role" WHERE id = ${role.id};
            `;
            
            console.log(`✓ Роль ${roleName} удалена`);
          }
        } else {
          console.log(`✓ Роль ${roleName} не найдена`);
        }
      } catch (error: any) {
        console.error(`❌ Ошибка при удалении роли ${roleName}:`, error.message);
      }
    }
    
    console.log("\n✅ Все ненужные системные роли обработаны!");
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

