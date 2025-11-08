-- Исправление отсутствующих колонок в таблице Product
-- Выполните этот скрипт на сервере в PostgreSQL

-- Добавляем колонку langameId (если её нет)
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "langameId" INTEGER;

-- Добавляем колонку isHidden (если её нет)
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "isHidden" BOOLEAN DEFAULT false;

-- Добавляем колонку stock (если её нет)
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "stock" INTEGER DEFAULT 0;

-- Добавляем колонку lastImportedAt (если её нет)
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "lastImportedAt" TIMESTAMP(3);

-- Создаем уникальный индекс для langameId (только для не-NULL значений)
CREATE UNIQUE INDEX IF NOT EXISTS "Product_langameId_key" ON "Product"("langameId") WHERE "langameId" IS NOT NULL;

-- Создаем индекс для isHidden
CREATE INDEX IF NOT EXISTS "Product_isHidden_idx" ON "Product"("isHidden");

-- Создаем индекс для langameId
CREATE INDEX IF NOT EXISTS "Product_langameId_idx" ON "Product"("langameId");

-- Проверяем результат
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'Product'
ORDER BY ordinal_position;

