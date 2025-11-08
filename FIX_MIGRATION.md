# 🔧 Исправление миграций на сервере

## Проблема

На сервере отсутствуют колонки в таблице `Product`:
- `langameId` - ID товара из Langame API
- `isHidden` - Скрыт ли товар

## Решение (ПОЛНАЯ ПОСЛЕДОВАТЕЛЬНОСТЬ)

Выполните на сервере следующие команды **ПО ПОРЯДКУ**:

```bash
# 1. Подключитесь к серверу
ssh root@otchet.24cybersyndicate.ru

# 2. Перейдите в директорию проекта
cd /var/www/salary-manager

# 3. Обновите код из GitHub (если нужно)
git pull origin main

# 4. Выполните SQL-скрипт для добавления колонок
sudo -u postgres psql -d salary -f fix_product_columns.sql

# ИЛИ выполните команды вручную:
sudo -u postgres psql -d salary << EOF
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "langameId" INTEGER;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "isHidden" BOOLEAN DEFAULT false;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "stock" INTEGER DEFAULT 0;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "lastImportedAt" TIMESTAMP(3);
CREATE UNIQUE INDEX IF NOT EXISTS "Product_langameId_key" ON "Product"("langameId") WHERE "langameId" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "Product_isHidden_idx" ON "Product"("isHidden");
CREATE INDEX IF NOT EXISTS "Product_langameId_idx" ON "Product"("langameId");
EOF

# 5. Проверьте, что колонки добавлены
sudo -u postgres psql -d salary -c "\d \"Product\""

# 6. ОБЯЗАТЕЛЬНО! Перегенерируйте Prisma Client
npx prisma generate

# 7. Проверьте, что Prisma Client сгенерирован
ls -la src/generated/prisma/client.ts

# 8. Пересоберите приложение (ОБЯЗАТЕЛЬНО!)
npm run build

# 9. Перезапустите приложение
pm2 restart salary-manager

# 10. Проверьте логи
pm2 logs salary-manager --lines 50
```

## Альтернативный способ (через Prisma)

Если хотите использовать Prisma для создания миграции:

```bash
# 1. На сервере
cd /var/www/salary-manager

# 2. Создайте новую миграцию
npx prisma migrate dev --name add_langame_fields_to_product --create-only

# 3. Отредактируйте созданный файл миграции (если нужно)
# nano prisma/migrations/XXXXXX_add_langame_fields_to_product/migration.sql

# 4. Примените миграцию
npx prisma migrate deploy

# 5. Перезапустите приложение
pm2 restart salary-manager
```

## Проверка

После выполнения команд проверьте, что колонки добавлены:

```bash
sudo -u postgres psql -d salary -c "\d \"Product\""
```

Должны быть видны колонки:
- `langameId` (integer, nullable)
- `isHidden` (boolean, default false)
- `stock` (integer, default 0)
- `lastImportedAt` (timestamp, nullable)

