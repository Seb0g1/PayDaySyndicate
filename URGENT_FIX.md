# ⚠️ СРОЧНО: Исправление базы данных на сервере

## Проблема

В логах видно, что колонки `langameId` и `isHidden` отсутствуют в таблице `Product`:
- `The column Product.langameId does not exist in the current database`
- `column p.isHidden does not exist`

## Решение (выполните СЕЙЧАС на сервере)

### Шаг 1: Подключитесь к серверу
```bash
ssh root@otchet.24cybersyndicate.ru
```

### Шаг 2: Перейдите в директорию проекта
```bash
cd /var/www/salary-manager
```

### Шаг 3: Обновите код из GitHub
```bash
git pull origin main
```

### Шаг 4: Выполните SQL-команды для добавления колонок

**Вариант 1: Если файл `fix_product_columns.sql` существует:**
```bash
sudo -u postgres psql -d salary -f fix_product_columns.sql
```

**Вариант 2: Если файл не найден, выполните команды вручную:**
```bash
sudo -u postgres psql -d salary << 'EOF'
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "langameId" INTEGER;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "isHidden" BOOLEAN DEFAULT false;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "stock" INTEGER DEFAULT 0;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "lastImportedAt" TIMESTAMP(3);
CREATE UNIQUE INDEX IF NOT EXISTS "Product_langameId_key" ON "Product"("langameId") WHERE "langameId" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "Product_isHidden_idx" ON "Product"("isHidden");
CREATE INDEX IF NOT EXISTS "Product_langameId_idx" ON "Product"("langameId");
EOF
```

### Шаг 5: Проверьте, что колонки добавлены
```bash
sudo -u postgres psql -d salary -c "\d \"Product\""
```

Вы должны увидеть колонки:
- `langameId` (integer, nullable)
- `isHidden` (boolean, default false)
- `stock` (integer, default 0)
- `lastImportedAt` (timestamp(3), nullable)

### Шаг 6: ОБЯЗАТЕЛЬНО! Перегенерируйте Prisma Client
```bash
npx prisma generate
```

### Шаг 7: ОБЯЗАТЕЛЬНО! Пересоберите приложение
```bash
npm run build
```

### Шаг 8: Перезапустите приложение
```bash
pm2 restart salary-manager
```

### Шаг 9: Проверьте логи
```bash
pm2 logs salary-manager --lines 50
```

## Важно!

**БЕЗ ШАГОВ 6-7 ПРИЛОЖЕНИЕ НЕ БУДЕТ РАБОТАТЬ!**

После добавления колонок в БД **ОБЯЗАТЕЛЬНО** выполните:
1. `npx prisma generate` - перегенерируйте Prisma Client
2. `npm run build` - пересоберите приложение
3. `pm2 restart salary-manager` - перезапустите приложение

Без этих шагов приложение будет продолжать использовать старый Prisma Client, который не знает о новых колонках!

## Быстрая проверка

После выполнения всех шагов, проверьте логи:
```bash
pm2 logs salary-manager --lines 20
```

Если ошибок больше нет, значит все исправлено!

