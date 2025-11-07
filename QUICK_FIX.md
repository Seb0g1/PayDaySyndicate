# 🚀 Быстрое исправление ошибок на сервере

## Проблема 1: Ошибка компиляции TypeScript - Prisma Client не найден

**Ошибка:**
```
Cannot find module '../src/generated/prisma/client'
```

**Решение:**

Выполните на сервере:

```bash
cd /var/www/salary-manager

# 1. Сгенерируйте Prisma Client (ОБЯЗАТЕЛЬНО!)
npx prisma generate

# 2. Проверьте, что файл создан
ls -la src/generated/prisma/client.ts

# 3. Теперь соберите проект
npm run build
```

## Проблема 2: Ошибка аутентификации PostgreSQL

**Ошибка:**
```
P1000: Authentication failed against database server
```

**Решение:**

```bash
# 1. Настройте PostgreSQL пользователя
su - postgres
psql

# В psql выполните:
CREATE USER salary_user WITH PASSWORD 'ваш_пароль';
CREATE DATABASE salary OWNER salary_user;
GRANT ALL PRIVILEGES ON DATABASE salary TO salary_user;
\q
exit

# 2. Обновите .env файл
nano /var/www/salary-manager/.env
# Убедитесь, что DATABASE_URL содержит правильный пароль

# 3. Примените миграции
cd /var/www/salary-manager
npx prisma migrate deploy
```

## Проблема 3: Nginx для поддомена

**Важно:** Конфигурация Nginx настроена только для поддомена `otchet.24cybersyndicate.ru` и не влияет на основной домен `24cybersyndicate.ru`.

**Проверка:**

```bash
# Проверьте конфигурацию Nginx
cat /etc/nginx/sites-available/salary-manager | grep server_name

# Должно быть:
# server_name otchet.24cybersyndicate.ru;

# Проверьте, что основной домен не затронут
cat /etc/nginx/sites-enabled/* | grep -A 5 "24cybersyndicate.ru" | grep -v "otchet"
```

## Полная последовательность команд для исправления

```bash
# 1. Перейдите в директорию проекта
cd /var/www/salary-manager

# 2. Исправьте PostgreSQL (если нужно)
# См. Проблема 2 выше

# 3. Генерируйте Prisma Client
npx prisma generate

# 4. Проверьте подключение к БД
npx prisma db pull

# 5. Примените миграции
npx prisma migrate deploy

# 6. Соберите проект
npm run build

# 7. Запустите с PM2
pm2 restart salary-manager

# 8. Проверьте логи
pm2 logs salary-manager
```

## Проверка после исправления

```bash
# Проверьте статус приложения
pm2 status

# Проверьте логи
pm2 logs salary-manager --lines 50

# Проверьте Nginx
systemctl status nginx
nginx -t

# Проверьте доступность
curl http://localhost:3000
```

## Если проблема сохраняется

1. **Проверьте логи:**
   ```bash
   pm2 logs salary-manager
   tail -f /var/log/nginx/otchet-error.log
   ```

2. **Проверьте переменные окружения:**
   ```bash
   cd /var/www/salary-manager
   cat .env | grep DATABASE_URL
   ```

3. **Проверьте Prisma Client:**
   ```bash
   ls -la src/generated/prisma/
   ```

4. **Пересоздайте Prisma Client:**
   ```bash
   rm -rf src/generated/prisma
   npx prisma generate
   ```

