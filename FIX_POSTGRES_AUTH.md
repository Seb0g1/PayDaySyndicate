# 🔧 Исправление ошибки аутентификации PostgreSQL

## Проблема

Ошибка: `Peer authentication failed for user "salary_user"`

Это происходит потому, что `salary_user` - это пользователь **базы данных PostgreSQL**, а не системный пользователь Linux.

## Решение

### Вариант 1: Использовать Prisma (рекомендуется)

```bash
cd /var/www/salary-manager

# Применить миграции через Prisma
npx prisma migrate deploy

# Проверить статус
npx prisma migrate status
```

Prisma использует `DATABASE_URL` из `.env` файла, поэтому аутентификация должна работать.

### Вариант 2: Применить миграцию через postgres пользователя

Если Prisma не работает, можно применить миграцию вручную:

```bash
cd /var/www/salary-manager

# Вариант 2a: Через sudo
sudo -u postgres psql -d salary -f prisma/migrations/20251105140000_add_langame_settings/migration.sql

# Вариант 2b: Через su
su - postgres
psql -d salary -f /var/www/salary-manager/prisma/migrations/20251105140000_add_langame_settings/migration.sql
exit

# Вариант 2c: С указанием пароля через переменную окружения
PGPASSWORD='ваш_пароль' psql -U salary_user -h localhost -d salary -f prisma/migrations/20251105140000_add_langame_settings/migration.sql
```

### Вариант 3: Использовать скрипт

```bash
cd /var/www/salary-manager
chmod +x apply-migration-fix.sh
./apply-migration-fix.sh
```

## Полное решение (рекомендуется)

```bash
cd /var/www/salary-manager

# 1. Остановите приложение
pm2 stop salary-manager

# 2. Примените миграции через Prisma (использует DATABASE_URL из .env)
npx prisma migrate deploy

# 3. Проверьте статус миграций
npx prisma migrate status

# 4. Удалите старый Prisma Client
rm -rf src/generated/prisma
rm -rf node_modules/.prisma
rm -rf .next

# 5. Сгенерируйте Prisma Client
npx prisma generate

# 6. Проверьте, что модель создана
ls -la src/generated/prisma/models/LangameSettings.ts

# 7. Пересоберите проект
npm run build

# 8. Перезапустите приложение
pm2 restart salary-manager
```

## Проверка подключения к БД

```bash
# Проверьте DATABASE_URL в .env
cat .env | grep DATABASE_URL

# Проверьте подключение через Prisma
npx prisma db pull

# Проверьте таблицу (через postgres пользователя)
sudo -u postgres psql -d salary -c "\d \"LangameSettings\""
```

## Если Prisma migrate deploy не работает

Проверьте:

1. **DATABASE_URL в .env:**
   ```bash
   cat .env | grep DATABASE_URL
   ```
   
   Должно быть что-то вроде:
   ```
   DATABASE_URL="postgresql://salary_user:пароль@localhost:5432/salary?schema=public"
   ```

2. **Подключение к БД:**
   ```bash
   npx prisma db pull
   ```

3. **Права пользователя:**
   ```bash
   sudo -u postgres psql
   # В psql:
   \du salary_user
   \l salary
   \q
   ```

## Важно

- **Не используйте `psql -U salary_user`** без указания хоста - это вызывает ошибку Peer authentication
- **Используйте `npx prisma migrate deploy`** - это самый надежный способ
- **Или используйте `sudo -u postgres psql`** для ручного применения миграций

