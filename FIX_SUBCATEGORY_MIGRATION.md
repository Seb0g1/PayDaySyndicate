# 🔧 Исправление: Отсутствует колонка Product.subcategory

## Проблема

Ошибка: `The column Product.subcategory does not exist in the current database.`

Это происходит потому, что в схеме Prisma есть поле `subcategory` в модели `Product`, но в базе данных эта колонка не существует.

## Решение

### На сервере выполните:

```bash
cd /var/www/salary-manager

# 1. Обновите код
git pull

# 2. Примените миграцию
npx prisma migrate deploy

# 3. Проверьте, что колонка создана
psql -U salary_user -d salary -c "\d \"Product\""
# Должна быть колонка subcategory

# 4. Перезапустите приложение
pm2 restart salary-manager
```

### Или примените миграцию вручную:

```bash
cd /var/www/salary-manager

# Примените миграцию через postgres пользователя
sudo -u postgres psql -d salary -f prisma/migrations/20251108010000_add_product_subcategory/migration.sql

# Или через Prisma
npx prisma migrate deploy
```

## Проверка после применения

```bash
# Проверьте колонку в БД
psql -U salary_user -d salary -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'Product' AND column_name = 'subcategory';"

# Должен вернуться результат с колонкой subcategory типа text
```

## Важно

После применения миграции перезапустите приложение, чтобы изменения вступили в силу.

