# ⚠️ СРОЧНО: Исправление базы данных на сервере

## Проблема

В логах видно, что колонки `langameId` и `isHidden` отсутствуют в таблице `Product`:
- `The column Product.langameId does not exist in the current database`
- `column p.isHidden does not exist`

## Решение (выполните СЕЙЧАС на сервере)

```bash
# 1. Подключитесь к серверу
ssh root@otchet.24cybersyndicate.ru

# 2. Перейдите в директорию проекта
cd /var/www/salary-manager

# 3. Обновите код из GitHub
git pull origin main

# 4. Выполните SQL-скрипт для добавления колонок
sudo -u postgres psql -d salary -f fix_product_columns.sql

# 5. Проверьте, что колонки добавлены
sudo -u postgres psql -d salary -c "\d \"Product\""

# 6. ОБЯЗАТЕЛЬНО! Перегенерируйте Prisma Client
npx prisma generate

# 7. ОБЯЗАТЕЛЬНО! Пересоберите приложение
npm run build

# 8. Перезапустите приложение
pm2 restart salary-manager

# 9. Проверьте логи
pm2 logs salary-manager --lines 50
```

## Если SQL-скрипт не найден, выполните команды вручную:

```bash
sudo -u postgres psql -d salary << EOF
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "langameId" INTEGER;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "isHidden" BOOLEAN DEFAULT false;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "stock" INTEGER DEFAULT 0;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "lastImportedAt" TIMESTAMP(3);
CREATE UNIQUE INDEX IF NOT EXISTS "Product_langameId_key" ON "Product"("langameId") WHERE "langameId" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "Product_isHidden_idx" ON "Product"("isHidden");
CREATE INDEX IF NOT EXISTS "Product_langameId_idx" ON "Product"("langameId");
EOF
```

## Важно!

После добавления колонок в БД **ОБЯЗАТЕЛЬНО** выполните:
1. `npx prisma generate` - перегенерируйте Prisma Client
2. `npm run build` - пересоберите приложение
3. `pm2 restart salary-manager` - перезапустите приложение

Без этих шагов приложение будет продолжать использовать старый Prisma Client, который не знает о новых колонках!

