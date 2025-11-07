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
  { name: "Адам", password: "CGJ-Ge-90", role: "DIRECTOR" as const },
  { name: "Данил", password: "CGJ-Ge-90", role: "SENIOR_ADMIN" as const },
  { name: "Максим", password: "123456789", role: "SENIOR_ADMIN" as const },
  { name: "Сэни", password: "123456789", role: "ADMIN" as const },
  { name: "Глеб", password: "123456789", role: "ADMIN" as const },
  { name: "Диана", password: "123456789", role: "ADMIN" as const },
  { name: "Паша", password: "123456789", role: "ADMIN" as const },
];

async function main() {
  console.log("Создание пользователей...");

  for (const userData of users) {
    const existing = await prisma.user.findFirst({ where: { name: userData.name } });
    const passwordHash = await hash(userData.password, 10);

    if (existing) {
      // Обновляем существующего пользователя
      let employeeId = existing.employeeId;
      
      // Создаем сотрудника, если его нет
      if (!employeeId) {
        const emp = await prisma.employee.create({
          data: {
            name: userData.name,
            hireDate: new Date(),
            payRate: 0,
            payUnit: "DAILY",
            role: "OTHER",
          },
        });
        employeeId = emp.id;
      }

      await prisma.user.update({
        where: { id: existing.id },
        data: {
          name: userData.name,
          password: passwordHash,
          role: userData.role,
          employeeId,
        },
      });

      console.log(`✓ Обновлен: ${userData.name} (${userData.role})`);
    } else {
      // Создаем нового пользователя
      const emp = await prisma.employee.create({
        data: {
          name: userData.name,
          hireDate: new Date(),
          payRate: 0,
          payUnit: "DAILY",
          role: "OTHER",
        },
      });

      await prisma.user.create({
        data: {
          name: userData.name,
          password: passwordHash,
          role: userData.role,
          employeeId: emp.id,
        },
      });

      console.log(`✓ Создан: ${userData.name} (${userData.role})`);
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

