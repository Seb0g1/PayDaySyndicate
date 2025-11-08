# Инструкция по деплою на сервер

## Подключение к серверу

```bash
ssh root@otchet.24cybersyndicate.ru
# или используйте предоставленные учетные данные
```

## Шаг 1: Обновление кода из GitHub

```bash
# Перейдите в директорию проекта
cd /path/to/salary-manager  # или где у вас находится проект

# Получите последние изменения
git pull origin main
```

## Шаг 2: Установка зависимостей (если нужно)

```bash
# Если были добавлены новые зависимости
npm install
```

## Шаг 3: Применение миграций базы данных

```bash
# Примените все новые миграции
npx prisma migrate deploy

# Или если нужно сгенерировать Prisma Client
npx prisma generate
```

## Шаг 4: Создание/обновление ролей (если нужно)

```bash
# Создайте системные роли, если их еще нет
npx tsx scripts/create-system-roles.ts

# Создайте новые роли с правами
npx tsx scripts/create-new-roles.ts
```

## Шаг 5: Сборка проекта

```bash
# Соберите проект для production
npm run build
```

## Шаг 6: Перезапуск приложения

```bash
# Перезапустите приложение через PM2
pm2 restart salary-manager

# Или если приложение еще не запущено
pm2 start npm --name "salary-manager" -- start

# Проверьте статус
pm2 status

# Просмотрите логи
pm2 logs salary-manager
```

## Шаг 7: Проверка работы

1. Откройте в браузере: `https://otchet.24cybersyndicate.ru`
2. Проверьте, что страница загружается
3. Попробуйте войти в систему
4. Проверьте, что чек-лист появляется для сотрудников (кроме DIRECTOR)
5. Проверьте права на долги:
   - Обычные сотрудники и старший админ могут добавлять долги только себе
   - DIRECTOR может добавлять долги всем

## Дополнительные команды

### Просмотр логов
```bash
pm2 logs salary-manager --lines 100
```

### Перезагрузка Nginx (если нужно)
```bash
sudo nginx -t  # Проверка конфигурации
sudo systemctl reload nginx
```

### Проверка статуса PostgreSQL
```bash
sudo systemctl status postgresql
```

### Просмотр переменных окружения
```bash
# Убедитесь, что .env файл содержит все необходимые переменные
cat .env
```

## Возможные проблемы и решения

### Проблема: Ошибка при применении миграций
```bash
# Проверьте подключение к базе данных
npx prisma db pull

# Если нужно, сбросьте миграции (ОСТОРОЖНО: это удалит данные!)
# npx prisma migrate reset
```

### Проблема: Приложение не запускается
```bash
# Проверьте логи
pm2 logs salary-manager

# Проверьте, что порт не занят
sudo netstat -tulpn | grep :3000

# Убедитесь, что все переменные окружения установлены
cat .env
```

### Проблема: Ошибки прав доступа
```bash
# Убедитесь, что роли созданы правильно
npx tsx scripts/check-roles.ts

# Пересоздайте роли, если нужно
npx tsx scripts/create-new-roles.ts
```

## Автоматический деплой (опционально)

Если хотите настроить автоматический деплой при push в GitHub:

1. Создайте скрипт деплоя:
```bash
#!/bin/bash
cd /path/to/salary-manager
git pull origin main
npm install
npx prisma migrate deploy
npx prisma generate
npm run build
pm2 restart salary-manager
```

2. Сделайте его исполняемым:
```bash
chmod +x deploy.sh
```

3. Настройте GitHub Actions или webhook для автоматического запуска

## Контакты

Если возникнут проблемы, проверьте:
- Логи приложения: `pm2 logs salary-manager`
- Логи Nginx: `sudo tail -f /var/log/nginx/error.log`
- Логи PostgreSQL: `sudo tail -f /var/log/postgresql/postgresql-*.log`

