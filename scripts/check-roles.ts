import { PrismaClient } from "../src/generated/prisma/client";
import { config } from "dotenv";
import { resolve } from "path";

const envPath = resolve(process.cwd(), ".env");
config({ path: envPath });

const prisma = new PrismaClient();

async function main() {
  try {
    console.log("Проверка ролей в базе данных...");
    
    const roles = await prisma.$queryRaw`
      SELECT * FROM "Role" ORDER BY name ASC;
    ` as any[];
    
    console.log(`\nНайдено ролей: ${roles.length}\n`);
    
    if (roles.length === 0) {
      console.log("❌ Роли не найдены в базе данных!");
    } else {
      roles.forEach((role, index) => {
        console.log(`${index + 1}. ${role.nameRu} (${role.name})`);
        console.log(`   ID: ${role.id}`);
        console.log(`   Системная: ${role.isSystem ? "Да" : "Нет"}`);
        console.log(`   Описание: ${role.description || "Нет"}`);
        console.log("");
      });
    }
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

