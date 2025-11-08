# Инструкция по полному деплою на сервер

## Быстрый старт

### На сервере выполните:

```bash
# 1. Подключитесь к серверу
ssh root@otchet.24cybersyndicate.ru
# Пароль: gkzF.t_TRSkR2N

# 2. Перейдите в директорию проекта (если проект уже есть)
cd /var/www/salary-manager

# 3. Получите последние изменения
git pull origin main

# 4. Сделайте скрипт исполняемым
chmod +x deploy-full.sh

# 5. Запустите полный автоматический деплой
./deploy-full.sh
```

## Что делает скрипт deploy-full.sh

Скрипт автоматически выполняет:

1. ✅ Обновление системы
2. ✅ Установку всех необходимых пакетов (Node.js, PostgreSQL, Nginx, PM2, Certbot)
3. ✅ Настройку PostgreSQL (создание БД и пользователя с паролем `CGJ-Ge-90`)
4. ✅ Клонирование/обновление проекта из GitHub
5. ✅ Установку зависимостей npm
6. ✅ Настройку переменных окружения (.env)
7. ✅ Применение миграций базы данных
8. ✅ Генерацию Prisma Client
9. ✅ Создание ролей в системе
10. ✅ Сборку проекта
11. ✅ Настройку PM2 для запуска приложения
12. ✅ Настройку Nginx для поддомена `otchet.24cybersyndicate.ru`
13. ✅ Получение SSL сертификата (если нужно)

## Конфигурация

Все пароли и настройки уже прописаны в скрипте:

- **Пароль БД**: `CGJ-Ge-90`
- **JWT Secret**: `CGJ-Ge-90`
- **NextAuth Secret**: `CGJ-Ge-90`
- **Домен**: `otchet.24cybersyndicate.ru`
- **Директория проекта**: `/var/www/salary-manager`

## Если что-то пошло не так

### Проверка статуса приложения:
```bash
pm2 status
pm2 logs salary-manager
```

### Проверка Nginx:
```bash
systemctl status nginx
nginx -t
```

### Проверка PostgreSQL:
```bash
sudo -u postgres psql -d salary
```

### Перезапуск приложения:
```bash
pm2 restart salary-manager
```

### Перезапуск Nginx:
```bash
systemctl reload nginx
```

## Очистка проекта (опционально)

Если хотите удалить ненужные файлы из проекта:

```bash
chmod +x cleanup-project.sh
./cleanup-project.sh
```

Это удалит:
- Лишние .md файлы (кроме README.md)
- Старые скрипты деплоя
- SQL скрипты в корне
- Excel файлы
- Временные файлы

## После деплоя

После успешного деплоя:

1. Откройте в браузере: `https://otchet.24cybersyndicate.ru`
2. Проверьте, что сайт загружается
3. Попробуйте войти в систему
4. Проверьте работу всех функций

## Создание пользователя "Данил"

Если нужно создать пользователя "Данил" с правами DIRECTOR:

```bash
cd /var/www/salary-manager
npx tsx scripts/create-admin-danil.ts
```

Или вручную через PostgreSQL:

```bash
sudo -u postgres psql -d salary
```

Затем выполните SQL:

```sql
-- Создание пользователя Данил
INSERT INTO "User" (id, name, email, password, role, "createdAt", "updatedAt")
VALUES (
  gen_random_uuid()::TEXT,
  'Данил',
  'danil@example.com',
  '$2a$10$...', -- Хеш пароля CGJ-Ge-90 (нужно сгенерировать)
  'DIRECTOR',
  NOW(),
  NOW()
);
```

## Обновление проекта

Для обновления проекта в будущем:

```bash
cd /var/www/salary-manager
git pull origin main
npm install
npx prisma migrate deploy
npx prisma generate
npm run build
pm2 restart salary-manager
```

Или просто запустите скрипт деплоя снова - он обновит все автоматически.

