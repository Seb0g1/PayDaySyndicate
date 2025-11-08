#!/bin/bash

# Скрипт для исправления failed миграций
# Использование: ./fix-migrations.sh

set -e

DB_NAME="salary"

echo "Исправление failed миграций..."

# Список всех возможных failed миграций
FAILED_MIGRATIONS=(
    "20251108040000_add_site_settings"
    "20251109000000_add_site_icon_and_permissions"
    "20251109010000_add_roles_and_permissions"
    "20251109020000_add_payslip_settings"
    "20251109030000_add_payslip_stamp_image"
)

# Помечаем все failed миграции как resolved
for migration in "${FAILED_MIGRATIONS[@]}"; do
    echo "Помечаем миграцию $migration как resolved..."
    npx prisma migrate resolve --applied "$migration" 2>/dev/null || echo "Миграция $migration не найдена или уже применена"
done

# Исправляем данные в базе если нужно
echo "Исправление данных в базе..."
sudo -u postgres psql -d "$DB_NAME" <<EOF
-- Исправляем SiteSettings если нужно
UPDATE "SiteSettings" SET "updatedAt" = CURRENT_TIMESTAMP WHERE "updatedAt" IS NULL;

-- Проверяем и создаем колонки для payslip если их нет
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'SiteSettings' AND column_name = 'payslipShowStamp') THEN
        ALTER TABLE "SiteSettings" ADD COLUMN "payslipShowStamp" BOOLEAN DEFAULT true;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'SiteSettings' AND column_name = 'payslipBorderColor') THEN
        ALTER TABLE "SiteSettings" ADD COLUMN "payslipBorderColor" TEXT DEFAULT '#000000';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'SiteSettings' AND column_name = 'payslipWatermark') THEN
        ALTER TABLE "SiteSettings" ADD COLUMN "payslipWatermark" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'SiteSettings' AND column_name = 'payslipStampImage') THEN
        ALTER TABLE "SiteSettings" ADD COLUMN "payslipStampImage" TEXT;
    END IF;
END
\$\$;
EOF

echo "Попытка применения миграций..."
npx prisma migrate deploy

echo "Готово!"

