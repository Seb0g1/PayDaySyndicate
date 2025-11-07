#!/bin/bash

# Скрипт для автоматического развертывания приложения
# Использование: ./deploy.sh

set -e  # Остановить выполнение при ошибке

echo "🚀 Начало развертывания Salary Manager..."

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Проверка, что скрипт запущен от root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}❌ Пожалуйста, запустите скрипт от имени root${NC}"
    exit 1
fi

# Переменные
APP_DIR="/var/www/salary-manager"
DB_NAME="salary"
DB_USER="salary_user"

echo -e "${YELLOW}📦 Обновление системы...${NC}"
apt update && apt upgrade -y

echo -e "${YELLOW}📦 Установка необходимых пакетов...${NC}"
# Установка Node.js 20.x
if ! command -v node &> /dev/null; then
    echo "Установка Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
fi

# Установка PostgreSQL
if ! command -v psql &> /dev/null; then
    echo "Установка PostgreSQL..."
    apt install -y postgresql postgresql-contrib
    systemctl start postgresql
    systemctl enable postgresql
fi

# Установка Nginx
if ! command -v nginx &> /dev/null; then
    echo "Установка Nginx..."
    apt install -y nginx
    systemctl start nginx
    systemctl enable nginx
fi

# Установка Git
if ! command -v git &> /dev/null; then
    echo "Установка Git..."
    apt install -y git
fi

# Установка PM2
if ! command -v pm2 &> /dev/null; then
    echo "Установка PM2..."
    npm install -g pm2
fi

# Установка certbot
if ! command -v certbot &> /dev/null; then
    echo "Установка certbot..."
    apt install -y certbot python3-certbot-nginx
fi

# Установка build-essential
if ! command -v make &> /dev/null; then
    echo "Установка build-essential..."
    apt install -y build-essential
fi

echo -e "${YELLOW}🗄️  Настройка PostgreSQL...${NC}"
# Проверка существования базы данных
if ! sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw $DB_NAME; then
    echo "Создание базы данных и пользователя..."
    read -sp "Введите пароль для пользователя БД: " DB_PASSWORD
    echo
    
    sudo -u postgres psql << EOF
CREATE DATABASE $DB_NAME;
CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
ALTER DATABASE $DB_NAME OWNER TO $DB_USER;
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
\q
EOF
    
    echo -e "${GREEN}✅ База данных создана${NC}"
else
    echo -e "${YELLOW}⚠️  База данных уже существует${NC}"
fi

echo -e "${YELLOW}📁 Настройка директории приложения...${NC}"
mkdir -p /var/www
cd /var/www

if [ -d "$APP_DIR" ]; then
    echo -e "${YELLOW}⚠️  Директория приложения уже существует. Обновление...${NC}"
    cd $APP_DIR
    git pull
else
    echo -e "${RED}❌ Директория приложения не найдена. Пожалуйста, клонируйте репозиторий вручную:${NC}"
    echo "git clone <your-repo-url> salary-manager"
    exit 1
fi

echo -e "${YELLOW}📦 Установка зависимостей...${NC}"
npm install

echo -e "${YELLOW}⚙️  Настройка переменных окружения...${NC}"
if [ ! -f .env ]; then
    if [ -f env.sample ]; then
        cp env.sample .env
        echo -e "${YELLOW}⚠️  Файл .env создан из env.sample. Пожалуйста, отредактируйте его:${NC}"
        echo "nano $APP_DIR/.env"
        read -p "Нажмите Enter после редактирования .env файла..."
    else
        echo -e "${RED}❌ Файл env.sample не найден${NC}"
        exit 1
    fi
fi

echo -e "${YELLOW}🗄️  Настройка базы данных...${NC}"
npx prisma generate
npx prisma migrate deploy

echo -e "${YELLOW}🔨 Сборка приложения...${NC}"
npm run build

echo -e "${YELLOW}🚀 Настройка PM2...${NC}"
if [ -f ecosystem.config.js ]; then
    pm2 delete salary-manager 2>/dev/null || true
    pm2 start ecosystem.config.js
    pm2 save
    pm2 startup | grep -v "PM2" | bash || true
else
    echo -e "${RED}❌ Файл ecosystem.config.js не найден${NC}"
    exit 1
fi

echo -e "${YELLOW}🌐 Настройка Nginx...${NC}"
if [ -f nginx.conf ]; then
    cp nginx.conf /etc/nginx/sites-available/salary-manager
    ln -sf /etc/nginx/sites-available/salary-manager /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    nginx -t && systemctl reload nginx
    echo -e "${GREEN}✅ Nginx настроен${NC}"
else
    echo -e "${YELLOW}⚠️  Файл nginx.conf не найден. Пожалуйста, настройте Nginx вручную${NC}"
fi

echo -e "${YELLOW}🔒 Настройка SSL (Let's Encrypt)...${NC}"
read -p "Хотите получить SSL сертификат сейчас? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    certbot --nginx -d otchet.24cybersyndicate.ru
    certbot renew --dry-run
fi

echo -e "${GREEN}✅ Развертывание завершено!${NC}"
echo -e "${GREEN}🌐 Приложение доступно по адресу: https://otchet.24cybersyndicate.ru${NC}"
echo -e "${YELLOW}📋 Полезные команды:${NC}"
echo "  - Просмотр логов: pm2 logs salary-manager"
echo "  - Перезапуск: pm2 restart salary-manager"
echo "  - Статус: pm2 status"

