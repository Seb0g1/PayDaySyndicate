#!/bin/bash

# Скрипт для исправления проблем с PostgreSQL
# Использование: ./fix-postgres.sh

set -e

echo "🔧 Исправление проблем с PostgreSQL..."

DB_NAME="salary"
DB_USER="salary_user"

# Проверка, что скрипт запущен от root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Пожалуйста, запустите скрипт от имени root"
    exit 1
fi

echo "📝 Инструкция по настройке PostgreSQL:"
echo ""
echo "1. Переключитесь на пользователя postgres:"
echo "   su - postgres"
echo ""
echo "2. Войдите в psql:"
echo "   psql"
echo ""
echo "3. Выполните следующие команды:"
echo ""
echo "   -- Проверить существование пользователя"
echo "   SELECT usename FROM pg_user WHERE usename = 'salary_user';"
echo ""
echo "   -- Если пользователь не существует, создать его:"
echo "   CREATE USER salary_user WITH PASSWORD 'ваш_надежный_пароль';"
echo ""
echo "   -- Или если пользователь существует, изменить пароль:"
echo "   ALTER USER salary_user WITH PASSWORD 'ваш_надежный_пароль';"
echo ""
echo "   -- Проверить существование базы данных"
echo "   SELECT datname FROM pg_database WHERE datname = 'salary';"
echo ""
echo "   -- Если база данных не существует, создать ее:"
echo "   CREATE DATABASE salary;"
echo ""
echo "   -- Назначить владельца базы данных"
echo "   ALTER DATABASE salary OWNER TO salary_user;"
echo ""
echo "   -- Выдать все привилегии"
echo "   GRANT ALL PRIVILEGES ON DATABASE salary TO salary_user;"
echo ""
echo "   -- Выйти из psql"
echo "   \q"
echo ""
echo "4. Вернуться к root:"
echo "   exit"
echo ""
echo "5. Обновить файл .env с правильным паролем"
echo ""

# Автоматическое исправление (если указан пароль)
read -p "Хотите автоматически создать/обновить пользователя? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -sp "Введите пароль для пользователя salary_user: " DB_PASSWORD
    echo
    
    # Удалить пользователя, если существует (для пересоздания)
    sudo -u postgres psql -c "DROP USER IF EXISTS $DB_USER;" 2>/dev/null || true
    
    # Создать пользователя
    sudo -u postgres psql << EOF
CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
CREATE DATABASE $DB_NAME OWNER $DB_USER;
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
\q
EOF
    
    echo "✅ Пользователь и база данных созданы/обновлены"
    echo ""
    echo "⚠️  Теперь обновите файл .env:"
    echo "   nano /var/www/salary-manager/.env"
    echo ""
    echo "   Убедитесь, что DATABASE_URL содержит правильный пароль:"
    echo "   DATABASE_URL=\"postgresql://salary_user:$DB_PASSWORD@localhost:5432/salary?schema=public\""
fi

# Проверка подключения
echo ""
echo "🔍 Проверка подключения к базе данных..."
read -p "Введите пароль из .env файла для проверки: " -s TEST_PASSWORD
echo

if PGPASSWORD="$TEST_PASSWORD" psql -h localhost -U salary_user -d salary -c "SELECT 1;" > /dev/null 2>&1; then
    echo "✅ Подключение к базе данных успешно!"
else
    echo "❌ Не удалось подключиться к базе данных"
    echo ""
    echo "Возможные причины:"
    echo "1. Пароль неверный"
    echo "2. Пользователь не существует"
    echo "3. Проблемы с pg_hba.conf"
    echo ""
    echo "Проверьте файл pg_hba.conf:"
    echo "   nano /etc/postgresql/*/main/pg_hba.conf"
    echo ""
    echo "Убедитесь, что есть строка:"
    echo "   local   all             all                                     md5"
    echo "   host    all             all             127.0.0.1/32            md5"
    echo ""
    echo "Затем перезапустите PostgreSQL:"
    echo "   systemctl restart postgresql"
fi

