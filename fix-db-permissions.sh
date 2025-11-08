#!/bin/bash

# Скрипт для исправления прав доступа к базе данных
# Использование: ./fix-db-permissions.sh

set -e

DB_NAME="salary"
DB_USER="salary_user"

echo "Исправление прав доступа к базе данных..."

# Предоставление прав на все таблицы в схеме public
sudo -u postgres psql -d "$DB_NAME" <<EOF
-- Предоставление прав на схему public
GRANT ALL ON SCHEMA public TO $DB_USER;
ALTER SCHEMA public OWNER TO $DB_USER;

-- Предоставление прав на все существующие таблицы
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $DB_USER;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $DB_USER;

-- Предоставление прав на все будущие таблицы
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $DB_USER;

-- Проверка прав
\dp
EOF

echo "Права доступа исправлены!"
echo "Перезапустите приложение: pm2 restart salary-manager"

