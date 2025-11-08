import { PrismaClient } from "../src/generated/prisma/client";
import { config } from "dotenv";
import { resolve } from "path";

const envPath = resolve(process.cwd(), ".env");
config({ path: envPath });

const prisma = new PrismaClient();

async function main() {
  try {
    console.log("Создание новых ролей с правами...");

    // 1. OWNER - Владелец, все возможности
    const ownerRole = await createRoleWithPermissions({
      name: "OWNER",
      nameRu: "Владелец",
      description: "Владелец системы, все возможности",
      isSystem: true,
      permissions: getAllPermissions("all"),
    });

    // 2. DIRECTOR - Управляющий, все возможности
    const directorRole = await createRoleWithPermissions({
      name: "DIRECTOR",
      nameRu: "Управляющий",
      description: "Управляющий, все возможности",
      isSystem: true,
      permissions: getAllPermissions("all"),
    });

    // 3. Admin - Обычный Сотрудник
    const adminRole = await createRoleWithPermissions({
      name: "Admin",
      nameRu: "Обычный Сотрудник",
      description: "Обычный сотрудник с базовыми правами",
      isSystem: false,
      permissions: [
        // Долги - добавлять себе (own)
        { page: "debts", action: "view", scope: "own", granted: true },
        { page: "debts", action: "create", scope: "own", granted: true },
        // Забытые вещи - добавлять
        { page: "lostItems", action: "view", scope: "all", granted: true },
        { page: "lostItems", action: "create", scope: "all", granted: true },
        { page: "lostItems", action: "edit", scope: "all", granted: true },
        // Отчёты - добавлять любые, только к своему имени (own)
        { page: "reports", action: "view", scope: "all", granted: true },
        { page: "reports", action: "create", scope: "own", granted: true },
        // Задачи - просматривать все, выполнять свои
        { page: "tasks", action: "view", scope: "all", granted: true },
        { page: "tasks", action: "edit", scope: "own", granted: true },
        // Чек-лист - просматривать
        { page: "checklist", action: "view", scope: "all", granted: true },
        // Недостачи - просматривать
        { page: "shortages", action: "view", scope: "all", granted: true },
        // Зарплата - просматривать свою
        { page: "salaries", action: "view", scope: "own", granted: true },
        // Смены - просматривать все, без редактирования
        { page: "shifts", action: "view", scope: "all", granted: true },
        // Сотрудники - просматривать
        { page: "employees", action: "view", scope: "all", granted: true },
        // Товары - просматривать
        { page: "products", action: "view", scope: "all", granted: true },
        // Заметки - просматривать
        { page: "memos", action: "view", scope: "all", granted: true },
        // Выплаты - просматривать свои
        { page: "payments", action: "view", scope: "own", granted: true },
      ],
    });

    // 4. Seniour_Admin - Старший Админ
    const seniorAdminRole = await createRoleWithPermissions({
      name: "Seniour_Admin",
      nameRu: "Старший Админ",
      description: "Старший администратор с расширенными правами",
      isSystem: false,
      permissions: [
        // Все права Admin
        ...adminRole.permissions,
        // Смены - полный доступ
        { page: "shifts", action: "create", scope: "all", granted: true },
        { page: "shifts", action: "edit", scope: "all", granted: true },
        { page: "shifts", action: "delete", scope: "all", granted: true },
        // Недостачи - изменять кол-во факт
        { page: "shortages", action: "edit", scope: "all", granted: true },
        // Долги - только для себя (явно переопределяем, чтобы убедиться, что scope = "own")
        { page: "debts", action: "view", scope: "own", granted: true },
        { page: "debts", action: "create", scope: "own", granted: true },
        // Отчёты - редактировать
        { page: "reports", action: "edit", scope: "all", granted: true },
        // Задачи - создавать и удалять
        { page: "tasks", action: "create", scope: "all", granted: true },
        { page: "tasks", action: "delete", scope: "all", granted: true },
        // Чек-лист - редактировать
        { page: "checklist", action: "edit", scope: "all", granted: true },
        // Товары - редактировать
        { page: "products", action: "edit", scope: "all", granted: true },
        // Заметки - создавать и редактировать
        { page: "memos", action: "create", scope: "all", granted: true },
        { page: "memos", action: "edit", scope: "all", granted: true },
        // Выплаты - просматривать все
        { page: "payments", action: "view", scope: "all", granted: true },
      ],
    });

    console.log("\n✅ Все роли созданы успешно!");
    console.log(`- OWNER (Владелец): ${ownerRole.id}`);
    console.log(`- DIRECTOR (Управляющий): ${directorRole.id}`);
    console.log(`- Admin (Обычный Сотрудник): ${adminRole.id}`);
    console.log(`- Seniour_Admin (Старший Админ): ${seniorAdminRole.id}`);
  } catch (error: any) {
    console.error("❌ Ошибка при создании ролей:", error.message);
    throw error;
  }
}

function getAllPermissions(scope: "all" | "own" | "none"): Array<{ page: string; action: string; scope: string; granted: boolean }> {
  const pages = [
    "employees", "shifts", "salaries", "reports", "debts", "shortages",
    "tasks", "products", "payments", "memos", "lostItems", "checklist",
    "pcManagement", "productOrder", "langame", "telegram"
  ];
  const actions = ["view", "create", "edit", "delete"];
  
  const permissions: Array<{ page: string; action: string; scope: string; granted: boolean }> = [];
  
  for (const page of pages) {
    for (const action of actions) {
      permissions.push({
        page,
        action,
        scope,
        granted: true,
      });
    }
  }
  
  return permissions;
}

async function createRoleWithPermissions({
  name,
  nameRu,
  description,
  isSystem,
  permissions,
}: {
  name: string;
  nameRu: string;
  description: string;
  isSystem: boolean;
  permissions: Array<{ page: string; action: string; scope: string; granted: boolean }>;
}) {
  try {
    // Проверяем, существует ли роль
    const existing = await prisma.$queryRaw`
      SELECT id FROM "Role" WHERE name = ${name} LIMIT 1;
    ` as any[];

    let roleId: string;

    if (existing && existing.length > 0) {
      // Обновляем существующую роль
      roleId = existing[0].id;
      await prisma.$executeRaw`
        UPDATE "Role" 
        SET "nameRu" = ${nameRu}, description = ${description}, "isSystem" = ${isSystem}, "updatedAt" = NOW()
        WHERE id = ${roleId};
      `;
      console.log(`✓ Роль ${nameRu} обновлена`);
    } else {
      // Создаем новую роль
      const result = await prisma.$queryRaw`
        INSERT INTO "Role" (id, name, "nameRu", description, "isSystem", "createdAt", "updatedAt")
        VALUES (
          gen_random_uuid()::TEXT,
          ${name},
          ${nameRu},
          ${description},
          ${isSystem},
          NOW(),
          NOW()
        )
        RETURNING id;
      ` as any[];
      
      if (!result || result.length === 0) {
        throw new Error(`Не удалось создать роль ${name}`);
      }
      
      roleId = result[0].id;
      console.log(`✓ Роль ${nameRu} создана`);
    }

    // Удаляем старые права роли
    await prisma.$executeRaw`
      DELETE FROM "RolePermission" WHERE "roleId" = ${roleId};
    `;

    // Создаем новые права
    for (const perm of permissions) {
      await prisma.$executeRaw`
        INSERT INTO "RolePermission" (id, "roleId", page, action, scope, granted, "createdAt", "updatedAt")
        VALUES (
          gen_random_uuid()::TEXT,
          ${roleId},
          ${perm.page},
          ${perm.action},
          ${perm.scope},
          ${perm.granted},
          NOW(),
          NOW()
        )
        ON CONFLICT ("roleId", page, action) DO UPDATE
        SET
          scope = ${perm.scope},
          granted = ${perm.granted},
          "updatedAt" = NOW();
      `;
    }

    console.log(`  ✓ Права для ${nameRu} установлены (${permissions.length} прав)`);

    // Получаем созданную роль с правами
    const role = await prisma.$queryRaw`
      SELECT * FROM "Role" WHERE id = ${roleId} LIMIT 1;
    ` as any[];

    const rolePermissions = await prisma.$queryRaw`
      SELECT * FROM "RolePermission" WHERE "roleId" = ${roleId};
    ` as any[];

    return {
      id: roleId,
      ...role[0],
      permissions: rolePermissions || [],
    };
  } catch (error: any) {
    console.error(`❌ Ошибка при создании роли ${name}:`, error.message);
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

