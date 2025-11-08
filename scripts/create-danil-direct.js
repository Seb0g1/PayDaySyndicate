const { PrismaClient } = require("../src/generated/prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const name = "Данил";
  const password = "CGJ-Ge-90";
  const role = "DIRECTOR";
  const email = "danil@admin.local";
  
  // Генерируем хэш пароля
  const hashedPassword = await bcrypt.hash(password, 10);
  console.log(`Хэш пароля: ${hashedPassword}`);
  
  try {
    // Используем прямой SQL запрос для обхода проблем с отсутствующими колонками
    const result = await prisma.$executeRaw`
      INSERT INTO "User" (id, name, email, password, role, "createdAt", "updatedAt")
      VALUES (
        gen_random_uuid()::TEXT,
        ${name},
        ${email},
        ${hashedPassword},
        ${role},
        NOW(),
        NOW()
      )
      ON CONFLICT (email) DO UPDATE
      SET 
        name = ${name},
        password = ${hashedPassword},
        role = ${role},
        "updatedAt" = NOW()
      RETURNING id, name, role;
    `;
    
    console.log(`✅ Пользователь "${name}" создан/обновлен с ролью ${role}`);
    console.log(`   Email: ${email}`);
    
    // Проверяем, что пользователь создан
    const user = await prisma.$queryRaw`
      SELECT id, name, email, role FROM "User" WHERE name = ${name} LIMIT 1;
    `;
    
    if (user && user.length > 0) {
      console.log(`   ID: ${user[0].id}`);
      console.log(`   Роль: ${user[0].role}`);
    }
    
  } catch (error) {
    // Если конфликта по email нет, пробуем другой подход
    if (error.code === 'P2002' || error.message?.includes('unique constraint')) {
      console.log("Пользователь уже существует, обновляем...");
      
      await prisma.$executeRaw`
        UPDATE "User"
        SET 
          password = ${hashedPassword},
          role = ${role},
          "updatedAt" = NOW()
        WHERE name = ${name};
      `;
      
      console.log(`✅ Пользователь "${name}" обновлен с ролью ${role}`);
    } else {
      console.error("❌ Ошибка:", error.message);
      throw error;
    }
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

