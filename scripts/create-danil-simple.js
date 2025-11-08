const { Client } = require("pg");
const bcrypt = require("bcryptjs");
require("dotenv").config();

async function main() {
  const name = "Данил";
  const password = "CGJ-Ge-90";
  const role = "DIRECTOR";
  const email = "danil@admin.local";
  
  // Генерируем хэш пароля
  const hashedPassword = await bcrypt.hash(password, 10);
  console.log(`Хэш пароля: ${hashedPassword}`);
  
  // Подключаемся к базе данных
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });
  
  try {
    await client.connect();
    console.log("Подключено к базе данных");
    
    // Проверяем, существует ли пользователь
    const checkResult = await client.query(
      'SELECT id, name, email, role FROM "User" WHERE name = $1',
      [name]
    );
    
    if (checkResult.rows.length > 0) {
      // Обновляем существующего пользователя
      await client.query(
        `UPDATE "User" 
         SET password = $1, role = $2, email = $3, "updatedAt" = NOW()
         WHERE name = $4`,
        [hashedPassword, role, email, name]
      );
      
      console.log(`✅ Пользователь "${name}" обновлен с ролью ${role}`);
      console.log(`   Email: ${email}`);
      console.log(`   ID: ${checkResult.rows[0].id}`);
    } else {
      // Создаем нового пользователя
      const result = await client.query(
        `INSERT INTO "User" (id, name, email, password, role, "createdAt", "updatedAt")
         VALUES (gen_random_uuid()::TEXT, $1, $2, $3, $4, NOW(), NOW())
         RETURNING id, name, email, role`,
        [name, email, hashedPassword, role]
      );
      
      console.log(`✅ Пользователь "${name}" создан с ролью ${role}`);
      console.log(`   Email: ${email}`);
      console.log(`   ID: ${result.rows[0].id}`);
    }
    
  } catch (error) {
    console.error("❌ Ошибка:", error.message);
    throw error;
  } finally {
    await client.end();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

