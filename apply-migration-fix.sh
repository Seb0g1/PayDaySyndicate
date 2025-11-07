#!/bin/bash

# Скрипт для применения миграции LangameSettings
# Использование: ./apply-migration-fix.sh

set -e

echo "🔧 Применение миграции для LangameSettings..."

cd /var/www/salary-manager

# Вариант 1: Использовать Prisma (рекомендуется)
echo "📋 Применение миграций через Prisma..."
npx prisma migrate deploy

# Проверка статуса
echo "✔ Проверка статуса миграций..."
npx prisma migrate status

# Вариант 2: Если Prisma не работает, применить через postgres пользователя
if [ $? -ne 0 ]; then
    echo "⚠️  Prisma не смог применить миграции, пробуем через postgres..."
    
    # Подключиться как postgres пользователь
    sudo -u postgres psql -d salary -f prisma/migrations/20251105140000_add_langame_settings/migration.sql
    
    echo "✅ Миграция применена вручную"
fi

# Проверка таблицы
echo "🔍 Проверка таблицы в БД..."
npx prisma db pull --schema=prisma/schema.prisma > /dev/null 2>&1 && echo "✅ Таблица LangameSettings существует" || echo "⚠️  Таблица не найдена"

# Генерация Prisma Client
echo "🔨 Генерация Prisma Client..."
rm -rf src/generated/prisma
npx prisma generate

# Проверка результата
if [ -f "src/generated/prisma/models/LangameSettings.ts" ]; then
    echo "✅ Модель LangameSettings успешно сгенерирована!"
else
    echo "❌ Ошибка: модель не была сгенерирована"
    exit 1
fi

echo ""
echo "✅ Готово!"

