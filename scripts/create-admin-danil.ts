import { PrismaClient } from "../src/generated/prisma/client";
import { hash } from "bcryptjs";
import { config } from "dotenv";
import { join } from "path";

config({ path: join(__dirname, "..", ".env") });

const prisma = new PrismaClient();

async function main() {
  const email = "danil@admin.local";
  const name = "Данил";
  const password = "CGJ-Ge-90";
  const role = "DIRECTOR";

  try {
    // Проверяем, существует ли пользователь по имени (так как email может быть не уникальным)
    const existing = await prisma.user.findFirst({
      where: { name },
    });

    if (existing) {
      console.log(`Пользователь "${name}" уже существует. Обновляем...`);
      
      // Обновляем пароль и роль
      const hashedPassword = await hash(password, 10);
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          email,
          name,
          password: hashedPassword,
          role: role as any,
        } as any, // Используем as any для обхода ошибок с customRoleId
      });
      
      console.log(`✅ Пользователь "${name}" обновлен с ролью ${role}`);
      console.log(`   Email: ${email}`);
      console.log(`   ID: ${existing.id}`);
    } else {
      // Создаем нового пользователя
      const hashedPassword = await hash(password, 10);
      const user = await prisma.user.create({
        data: {
          email,
          name,
          password: hashedPassword,
          role: role as any,
        } as any, // Используем as any для обхода ошибок с customRoleId
      });
      
      console.log(`✅ Пользователь "${name}" создан с ролью ${role}`);
      console.log(`   Email: ${email}`);
      console.log(`   ID: ${user.id}`);
    }
  } catch (error: any) {
    console.error("❌ Ошибка при создании пользователя:", error.message);
    if (error.message?.includes("customRoleId")) {
      console.error("\n⚠️  Внимание: В базе данных отсутствует колонка customRoleId.");
      console.error("   Примените миграции: npx prisma migrate deploy");
      console.error("   Или используйте существующий скрипт: npx tsx scripts/create-users.ts");
    }
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

