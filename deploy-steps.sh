#!/bin/bash

# Пошаговые команды для развертывания на сервере
# Использование: выполняйте команды по порядку

echo "📋 Пошаговое развертывание Salary Manager"
echo ""
echo "Выполняйте команды по порядку:"
echo ""

echo "1️⃣  Подключение к серверу:"
echo "   ssh root@93.183.82.104"
echo ""

echo "2️⃣  Переход в директорию проекта:"
echo "   cd /var/www/salary-manager"
echo ""

echo "3️⃣  Убедитесь, что PostgreSQL настроен:"
echo "   su - postgres"
echo "   psql"
echo "   -- Проверить пользователя: SELECT usename FROM pg_user WHERE usename = 'salary_user';"
echo "   -- Если нет, создать: CREATE USER salary_user WITH PASSWORD 'ваш_пароль';"
echo "   -- Проверить БД: SELECT datname FROM pg_database WHERE datname = 'salary';"
echo "   -- Если нет, создать: CREATE DATABASE salary OWNER salary_user;"
echo "   -- Выйти: \\q и exit"
echo ""

echo "4️⃣  Обновить .env файл:"
echo "   nano .env"
echo "   # Убедитесь, что DATABASE_URL содержит правильный пароль"
echo ""

echo "5️⃣  ГЕНЕРАЦИЯ PRISMA CLIENT (ОБЯЗАТЕЛЬНО!):"
echo "   npx prisma generate"
echo ""

echo "6️⃣  Проверка генерации:"
echo "   ls -la src/generated/prisma/client.ts"
echo ""

echo "7️⃣  Применение миграций:"
echo "   npx prisma migrate deploy"
echo ""

echo "8️⃣  Сборка проекта:"
echo "   npm run build"
echo ""

echo "9️⃣  Настройка PM2:"
echo "   pm2 start ecosystem.config.js"
echo "   pm2 save"
echo "   pm2 startup"
echo ""

echo "🔟 Настройка Nginx:"
echo "   cp nginx.conf /etc/nginx/sites-available/salary-manager"
echo "   ln -sf /etc/nginx/sites-available/salary-manager /etc/nginx/sites-enabled/"
echo "   nginx -t"
echo "   systemctl reload nginx"
echo ""

echo "1️⃣1️⃣  Получение SSL сертификата:"
echo "   certbot --nginx -d otchet.24cybersyndicate.ru"
echo ""

echo "✅ Готово!"

