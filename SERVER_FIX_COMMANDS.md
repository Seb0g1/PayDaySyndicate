# 🔧 Команды для исправления на сервере

## Выполните эти команды на сервере по порядку:

### 1. Исправление ошибки компиляции TypeScript

```bash
cd /var/www/salary-manager

# ОБЯЗАТЕЛЬНО: Сгенерируйте Prisma Client перед сборкой!
npx prisma generate

# Проверьте, что файл создан
ls -la src/generated/prisma/client.ts

# Теперь соберите проект
npm run build
```

### 2. Если ошибка аутентификации PostgreSQL

```bash
# Настройте пользователя БД
su - postgres
psql

# В psql:
CREATE USER salary_user WITH PASSWORD 'ваш_пароль';
CREATE DATABASE salary OWNER salary_user;
GRANT ALL PRIVILEGES ON DATABASE salary TO salary_user;
\q
exit

# Обновите .env
nano /var/www/salary-manager/.env
# Проверьте DATABASE_URL

# Примените миграции
cd /var/www/salary-manager
npx prisma migrate deploy
```

### 3. Проверка конфигурации Nginx для поддомена

Конфигурация Nginx уже настроена только для поддомена `otchet.24cybersyndicate.ru` и **не влияет на основной домен** `24cybersyndicate.ru`.

Проверьте:

```bash
# Убедитесь, что конфигурация правильная
cat /etc/nginx/sites-available/salary-manager | grep server_name
# Должно быть: server_name otchet.24cybersyndicate.ru;

# Проверьте конфигурацию
nginx -t

# Перезагрузите Nginx
systemctl reload nginx
```

### 4. Запуск приложения

```bash
cd /var/www/salary-manager

# Запустите с PM2
pm2 start ecosystem.config.js
pm2 save

# Или перезапустите, если уже запущено
pm2 restart salary-manager

# Проверьте статус
pm2 status
pm2 logs salary-manager
```

## Полная последовательность (если начиная с нуля):

```bash
# 1. Перейдите в директорию
cd /var/www/salary-manager

# 2. Настройте PostgreSQL (если нужно)
su - postgres
psql
# CREATE USER salary_user WITH PASSWORD 'пароль';
# CREATE DATABASE salary OWNER salary_user;
# GRANT ALL PRIVILEGES ON DATABASE salary TO salary_user;
# \q
# exit

# 3. Обновите .env
nano .env
# Проверьте DATABASE_URL

# 4. ГЕНЕРАЦИЯ PRISMA CLIENT (критично! ОБЯЗАТЕЛЬНО перед сборкой!)
npx prisma generate

# 5. Проверьте, что Prisma Client сгенерирован
ls -la src/generated/prisma/
# Должны быть файлы, включая модели для всех таблиц

# 6. Примените миграции
npx prisma migrate deploy

# 7. Соберите проект
npm run build

# 7. Запустите
pm2 restart salary-manager

# 8. Проверьте
pm2 logs salary-manager
```

## Важные замечания:

1. **Prisma Client ДОЛЖЕН быть сгенерирован перед `npm run build`**
2. **Конфигурация Nginx работает только для поддомена `otchet.24cybersyndicate.ru`**
3. **Основной домен `24cybersyndicate.ru` не затронут**

