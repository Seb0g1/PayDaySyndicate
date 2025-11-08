import { PrismaClient } from "../src/generated/prisma/client";
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
    const existingUser = await prisma.$queryRaw`
      SELECT id, name, email, role, "employeeId" FROM "User" WHERE name = ${name} LIMIT 1;
    ` as any[];

    if (existingUser && existingUser.length > 0) {
      console.log(`Пользователь "${name}" уже существует. Обновляем...`);
      
      const userId = existingUser[0].id;
      const employeeId = existingUser[0].employeeId;
      
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
      
      // Проверяем, есть ли связанный сотрудник
      if (!employeeId) {
        console.log("Создаем связанного сотрудника...");
        
        // Создаем сотрудника
        const employeeResult = await prisma.$queryRaw`
          INSERT INTO "Employee" (id, name, email, "hireDate", "payRate", "payUnit", role, "userRole", "createdAt", "updatedAt")
          VALUES (
            gen_random_uuid()::TEXT,
            ${name},
            ${email},
            NOW(),
            0::DECIMAL(10, 2),
            'DAILY'::"PayRateUnit",
            'OTHER'::"EmployeeRole",
            ${role}::"UserRole",
            NOW(),
            NOW()
          )
          RETURNING id;
        ` as any[];
        
        if (employeeResult && employeeResult.length > 0) {
          const newEmployeeId = employeeResult[0].id;
          
          // Связываем пользователя с сотрудником
          await prisma.$executeRaw`
            UPDATE "User"
            SET "employeeId" = ${newEmployeeId}
            WHERE id = ${userId};
          `;
          
          console.log(`✅ Сотрудник создан и связан с пользователем`);
        }
      }
      
      console.log(`✅ Пользователь "${name}" обновлен с ролью ${role}`);
      console.log(`   Email: ${email}`);
      console.log(`   ID: ${userId}`);
    } else {
      // Создаем нового пользователя
      const userResult = await prisma.$queryRaw`
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

      if (userResult && userResult.length > 0) {
        const userId = userResult[0].id;
        
        console.log(`✅ Пользователь "${name}" создан с ролью ${role}`);
        console.log(`   Email: ${email}`);
        console.log(`   ID: ${userId}`);
        
        // Создаем связанного сотрудника
        console.log("Создаем связанного сотрудника...");
        
        const employeeResult = await prisma.$queryRaw`
          INSERT INTO "Employee" (id, name, email, "hireDate", "payRate", "payUnit", role, "userRole", "createdAt", "updatedAt")
          VALUES (
            gen_random_uuid()::TEXT,
            ${name},
            ${email},
            NOW(),
            0::DECIMAL(10, 2),
            'DAILY'::"PayRateUnit",
            'OTHER'::"EmployeeRole",
            ${role}::"UserRole",
            NOW(),
            NOW()
          )
          RETURNING id;
        ` as any[];
        
        if (employeeResult && employeeResult.length > 0) {
          const employeeId = employeeResult[0].id;
          
          // Связываем пользователя с сотрудником
          await prisma.$executeRaw`
            UPDATE "User"
            SET "employeeId" = ${employeeId}
            WHERE id = ${userId};
          `;
          
          console.log(`✅ Сотрудник создан и связан с пользователем`);
          console.log(`   Employee ID: ${employeeId}`);
        }
        
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

