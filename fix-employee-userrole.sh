#!/bin/bash

# Скрипт для добавления колонки userRole в таблицу Employee
# Использование: ./fix-employee-userrole.sh

set -e

DB_NAME="salary"

echo "Добавление колонки userRole в таблицу Employee..."

# Проверяем и добавляем колонку userRole если её нет
sudo -u postgres psql -d "$DB_NAME" <<EOF
-- Проверяем, существует ли колонка userRole
DO \$\$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Employee' AND column_name = 'userRole'
    ) THEN
        -- Добавляем колонку userRole
        ALTER TABLE "Employee" ADD COLUMN "userRole" "UserRole";
        RAISE NOTICE 'Колонка userRole добавлена в таблицу Employee';
    ELSE
        RAISE NOTICE 'Колонка userRole уже существует';
    END IF;
END
\$\$;
EOF

echo "Готово!"
echo "Перезапустите приложение: pm2 restart salary-manager"

