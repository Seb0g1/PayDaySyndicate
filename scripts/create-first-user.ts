import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { config } from "dotenv";
import { resolve } from "path";

const envPath = resolve(process.cwd(), ".env");
config({ path: envPath });

const prisma = new PrismaClient();

async function main() {
  const email = "danil@admin.local";
  const name = "Данил";
  const password = "CGJ-Ge-90";
  const role = "DIRECTOR";

  try {
    console.log("Создание первого пользователя с правами DIRECTOR...");

    // Генерируем хэш пароля
    const hashedPassword = await hash(password, 10);

    // Проверяем, существует ли пользователь
    const existing = await prisma.$queryRaw`
      SELECT id, name, email, role FROM "User" WHERE name = ${name} LIMIT 1;
    ` as any[];

    if (existing && existing.length > 0) {
      console.log(`Пользователь "${name}" уже существует. Обновляем...`);
      
      // Обновляем существующего пользователя
      await prisma.$executeRaw`
        UPDATE "User"
        SET 
          email = ${email},
          password = ${hashedPassword},
          role = ${role}::"UserRole",
          "updatedAt" = NOW()
        WHERE name = ${name};
      `;
      
      console.log(`✅ Пользователь "${name}" обновлен с ролью ${role}`);
      console.log(`   Email: ${email}`);
      console.log(`   ID: ${existing[0].id}`);
    } else {
      // Создаем нового пользователя
      const result = await prisma.$queryRaw`
        INSERT INTO "User" (id, name, email, password, role, "createdAt", "updatedAt")
        VALUES (
          gen_random_uuid()::TEXT,
          ${name},
          ${email},
          ${hashedPassword},
          ${role}::"UserRole",
          NOW(),
          NOW()
        )
        RETURNING id, name, email, role;
      ` as any[];

      if (result && result.length > 0) {
        console.log(`✅ Пользователь "${name}" создан с ролью ${role}`);
        console.log(`   Email: ${email}`);
        console.log(`   ID: ${result[0].id}`);
        console.log(`\n📝 Данные для входа:`);
        console.log(`   Логин: ${name}`);
        console.log(`   Пароль: ${password}`);
      } else {
        throw new Error("Не удалось создать пользователя");
      }
    }
  } catch (error: any) {
    console.error("❌ Ошибка при создании пользователя:", error.message);
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

