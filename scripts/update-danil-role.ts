import { PrismaClient } from "../src/generated/prisma/client";
import { config } from "dotenv";
import { join } from "path";

// Загружаем переменные окружения
config({ path: join(process.cwd(), ".env") });

const prisma = new PrismaClient();

async function main() {
  console.log("Обновление роли Данила на DIRECTOR...");

  const user = await prisma.user.findFirst({ where: { name: "Данил" } });

  if (!user) {
    console.error("Пользователь 'Данил' не найден!");
    process.exit(1);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { role: "DIRECTOR" },
  });

  console.log("✓ Роль Данила успешно изменена на DIRECTOR");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

