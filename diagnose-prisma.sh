#!/bin/bash

# Диагностический скрипт для проверки Prisma Client
# Использование: ./diagnose-prisma.sh

set -e

echo "🔍 Диагностика Prisma Client..."
echo ""

cd /var/www/salary-manager

# 1. Проверка схемы
echo "1️⃣  Проверка схемы Prisma..."
if [ ! -f "prisma/schema.prisma" ]; then
    echo "❌ Ошибка: prisma/schema.prisma не найден!"
    exit 1
fi

if grep -q "model LangameSettings" prisma/schema.prisma; then
    echo "✅ Модель LangameSettings найдена в схеме"
    echo "   Содержимое модели:"
    grep -A 12 "model LangameSettings" prisma/schema.prisma | head -13
else
    echo "❌ Ошибка: модель LangameSettings НЕ найдена в схеме!"
    exit 1
fi

echo ""

# 2. Проверка генератора
echo "2️⃣  Проверка генератора Prisma..."
if grep -q "generator client" prisma/schema.prisma; then
    echo "✅ Генератор найден:"
    grep -A 3 "generator client" prisma/schema.prisma
else
    echo "❌ Ошибка: генератор не найден!"
    exit 1
fi

echo ""

# 3. Проверка миграций
echo "3️⃣  Проверка миграций..."
if [ -d "prisma/migrations" ]; then
    MIGRATION_COUNT=$(find prisma/migrations -name "migration.sql" | wc -l)
    echo "✅ Найдено миграций: $MIGRATION_COUNT"
    
    if find prisma/migrations -name "*langame*" -o -name "*Langame*" | grep -q .; then
        echo "✅ Миграция для LangameSettings найдена:"
        find prisma/migrations -name "*langame*" -o -name "*Langame*"
    else
        echo "⚠️  Предупреждение: миграция для LangameSettings не найдена"
    fi
else
    echo "❌ Ошибка: папка prisma/migrations не найдена!"
    exit 1
fi

echo ""

# 4. Проверка статуса миграций
echo "4️⃣  Проверка статуса миграций в БД..."
if npx prisma migrate status 2>&1 | grep -q "Database schema is up to date"; then
    echo "✅ Все миграции применены"
elif npx prisma migrate status 2>&1 | grep -q "following migration have not yet been applied"; then
    echo "⚠️  Есть непримененные миграции:"
    npx prisma migrate status
else
    echo "⚠️  Не удалось проверить статус миграций"
    npx prisma migrate status
fi

echo ""

# 5. Проверка Prisma Client
echo "5️⃣  Проверка Prisma Client..."
if [ -d "src/generated/prisma" ]; then
    echo "✅ Папка src/generated/prisma существует"
    
    if [ -f "src/generated/prisma/client.ts" ]; then
        echo "✅ Файл client.ts существует"
    else
        echo "❌ Ошибка: файл client.ts НЕ существует!"
    fi
    
    if [ -d "src/generated/prisma/models" ]; then
        echo "✅ Папка models существует"
        MODEL_COUNT=$(find src/generated/prisma/models -name "*.ts" | wc -l)
        echo "   Найдено моделей: $MODEL_COUNT"
        
        if [ -f "src/generated/prisma/models/LangameSettings.ts" ]; then
            echo "✅ Файл LangameSettings.ts существует"
        else
            echo "❌ Ошибка: файл LangameSettings.ts НЕ существует!"
            echo "   Доступные модели:"
            ls -1 src/generated/prisma/models/ | head -10
        fi
    else
        echo "❌ Ошибка: папка models НЕ существует!"
    fi
    
    if [ -f "src/generated/prisma/internal/class.ts" ]; then
        if grep -q "langameSettings" src/generated/prisma/internal/class.ts; then
            echo "✅ Модель langameSettings найдена в class.ts"
        else
            echo "❌ Ошибка: модель langameSettings НЕ найдена в class.ts"
        fi
    else
        echo "⚠️  Предупреждение: файл class.ts не найден"
    fi
else
    echo "❌ Ошибка: папка src/generated/prisma НЕ существует!"
    echo "   Prisma Client не был сгенерирован!"
fi

echo ""

# 6. Проверка подключения к БД
echo "6️⃣  Проверка подключения к базе данных..."
if npx prisma db pull --schema=prisma/schema.prisma > /dev/null 2>&1; then
    echo "✅ Подключение к БД успешно"
    
    # Проверка таблицы в БД
    if npx prisma db execute --stdin <<< "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'LangameSettings';" 2>/dev/null | grep -q "LangameSettings"; then
        echo "✅ Таблица LangameSettings существует в БД"
    else
        echo "⚠️  Предупреждение: таблица LangameSettings НЕ найдена в БД"
        echo "   Нужно применить миграцию: npx prisma migrate deploy"
    fi
else
    echo "❌ Ошибка: не удалось подключиться к БД"
    echo "   Проверьте DATABASE_URL в .env"
fi

echo ""
echo "✅ Диагностика завершена"

