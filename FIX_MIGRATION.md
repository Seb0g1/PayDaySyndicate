# 🔧 Исправление миграций на сервере

## Проблема

На сервере отсутствуют колонки в таблице `Product`:
- `langameId` - ID товара из Langame API
- `isHidden` - Скрыт ли товар

## Решение

Выполните на сервере следующие команды:

```bash
# 1. Подключитесь к серверу
ssh root@otchet.24cybersyndicate.ru

# 2. Перейдите в директорию проекта
cd /var/www/salary-manager

# 3. Подключитесь к PostgreSQL
sudo -u postgres psql -d salary

# 4. Добавьте недостающие колонки (выполните в psql):
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "langameId" INTEGER;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "isHidden" BOOLEAN DEFAULT false;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "stock" INTEGER DEFAULT 0;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "lastImportedAt" TIMESTAMP(3);

# 5. Создайте уникальный индекс для langameId (если его нет)
CREATE UNIQUE INDEX IF NOT EXISTS "Product_langameId_key" ON "Product"("langameId") WHERE "langameId" IS NOT NULL;

# 6. Создайте индекс для isHidden (если его нет)
CREATE INDEX IF NOT EXISTS "Product_isHidden_idx" ON "Product"("isHidden");

# 7. Создайте индекс для langameId (если его нет)
CREATE INDEX IF NOT EXISTS "Product_langameId_idx" ON "Product"("langameId");

# 8. Выйдите из psql
\q

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

