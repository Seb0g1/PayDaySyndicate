#!/bin/bash

# Скрипт для очистки проекта от ненужных файлов
# Оставляет только важные файлы для работы

set -e

echo "Очистка проекта от ненужных файлов..."

# Удаляем документацию (оставляем только README.md)
find . -maxdepth 1 -name "*.md" ! -name "README.md" -type f -delete

# Удаляем старые скрипты деплоя (кроме deploy-full.sh)
find . -maxdepth 1 -name "*.sh" ! -name "deploy-full.sh" ! -name "cleanup-project.sh" -type f -delete

# Удаляем старые SQL скрипты
find . -maxdepth 1 -name "*.sql" -type f -delete

# Удаляем старые JS скрипты в корне
find . -maxdepth 1 -name "*.js" ! -name "next.config.ts" -type f -delete

# Удаляем bat файлы
find . -maxdepth 1 -name "*.bat" -type f -delete

# Удаляем Excel файлы
find . -maxdepth 1 -name "*.xlsx" -type f -delete

# Удаляем старые конфигурационные файлы деплоя
rm -f deploy-steps.sh deploy.sh update-server.sh fix-postgres.sh diagnose-prisma.sh fix-prisma-client.sh apply-migration-fix.sh

# Удаляем старые конфигурации PM2 (если есть)
rm -f ecosystem.config.js

# Удаляем ненужные скрипты в scripts/ (оставляем только важные)
cd scripts
rm -f create-danil-direct.js create-danil-simple.js create-danil.sql create-admin-danil.ts create-users.ts update-danil-role.ts
cd ..

echo "Очистка завершена!"
echo "Оставлены только важные файлы для работы проекта."

