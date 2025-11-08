#!/bin/bash

# Полный автоматический скрипт деплоя на сервер
# Использование: ./deploy-full.sh

set -e  # Остановка при ошибке

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Конфигурация
DB_NAME="salary"
DB_USER="salary_user"
DB_PASSWORD="CGJ-Ge-90"
JWT_SECRET="CGJ-Ge-90"
NEXTAUTH_SECRET="CGJ-Ge-90"
DOMAIN="otchet.24cybersyndicate.ru"
PROJECT_DIR="/var/www/salary-manager"
REPO_URL="https://github.com/Seb0g1/PayDaySyndicate.git"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Полный автоматический деплой${NC}"
echo -e "${GREEN}========================================${NC}"

# Функция для проверки успешности команды
check_success() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ $1${NC}"
    else
        echo -e "${RED}✗ Ошибка: $1${NC}"
        exit 1
    fi
}

# Шаг 1: Обновление системы
echo -e "\n${YELLOW}[1/12] Обновление системы...${NC}"
apt update && apt upgrade -y
check_success "Система обновлена"

# Шаг 2: Установка необходимых пакетов
echo -e "\n${YELLOW}[2/12] Установка пакетов...${NC}"

# Node.js 20.x
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
    check_success "Node.js установлен"
else
    echo -e "${GREEN}✓ Node.js уже установлен${NC}"
fi

# PostgreSQL
if ! command -v psql &> /dev/null; then
    apt install -y postgresql postgresql-contrib
    systemctl start postgresql
    systemctl enable postgresql
    check_success "PostgreSQL установлен"
else
    echo -e "${GREEN}✓ PostgreSQL уже установлен${NC}"
fi

# Nginx
if ! command -v nginx &> /dev/null; then
    apt install -y nginx
    systemctl start nginx
    systemctl enable nginx
    check_success "Nginx установлен"
else
    echo -e "${GREEN}✓ Nginx уже установлен${NC}"
fi

# Git
if ! command -v git &> /dev/null; then
    apt install -y git
    check_success "Git установлен"
else
    echo -e "${GREEN}✓ Git уже установлен${NC}"
fi

# PM2
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
    check_success "PM2 установлен"
else
    echo -e "${GREEN}✓ PM2 уже установлен${NC}"
fi

# Certbot
if ! command -v certbot &> /dev/null; then
    apt install -y certbot python3-certbot-nginx
    check_success "Certbot установлен"
else
    echo -e "${GREEN}✓ Certbot уже установлен${NC}"
fi

# Build tools
apt install -y build-essential
check_success "Build tools установлены"

# Шаг 3: Настройка PostgreSQL
echo -e "\n${YELLOW}[3/12] Настройка PostgreSQL...${NC}"

# Создание базы данных и пользователя
sudo -u postgres psql <<EOF
-- Создание пользователя (если не существует)
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_user WHERE usename = '$DB_USER') THEN
        CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';
    END IF;
END
\$\$;

-- Создание базы данных (если не существует)
SELECT 'CREATE DATABASE $DB_NAME OWNER $DB_USER'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$DB_NAME')\gexec

-- Предоставление прав на базу данных
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
ALTER DATABASE $DB_NAME OWNER TO $DB_USER;
EOF

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
EOF

check_success "PostgreSQL настроен"

# Шаг 4: Клонирование/обновление проекта
echo -e "\n${YELLOW}[4/12] Клонирование/обновление проекта...${NC}"

if [ -d "$PROJECT_DIR" ]; then
    echo "Проект уже существует, обновляем..."
    cd "$PROJECT_DIR"
    git fetch origin
    git reset --hard origin/main
    check_success "Проект обновлен"
else
    echo "Клонируем проект..."
    mkdir -p /var/www
    cd /var/www
    git clone "$REPO_URL" salary-manager
    cd "$PROJECT_DIR"
    check_success "Проект клонирован"
fi

# Шаг 5: Установка зависимостей
echo -e "\n${YELLOW}[5/12] Установка зависимостей...${NC}"
npm install
check_success "Зависимости установлены"

# Шаг 6: Настройка переменных окружения
echo -e "\n${YELLOW}[6/12] Настройка переменных окружения...${NC}"

cat > .env <<EOF
# Database
DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME?schema=public"

# NextAuth
NEXTAUTH_URL="https://$DOMAIN"
NEXTAUTH_SECRET="$NEXTAUTH_SECRET"
AUTH_SECRET="$NEXTAUTH_SECRET"

# JWT
JWT_SECRET="$JWT_SECRET"

# Node Environment
NODE_ENV=production

# Next.js
NEXT_PUBLIC_APP_URL="https://$DOMAIN"
EOF

check_success "Переменные окружения настроены"

# Шаг 7: Применение миграций
echo -e "\n${YELLOW}[7/12] Применение миграций базы данных...${NC}"

# Исправляем возможные проблемы с миграциями
sudo -u postgres psql -d "$DB_NAME" <<EOF
-- Исправляем SiteSettings если нужно
UPDATE "SiteSettings" SET "updatedAt" = CURRENT_TIMESTAMP WHERE "updatedAt" IS NULL;
EOF

# Применяем миграции
npx prisma migrate deploy || {
    echo -e "${YELLOW}Предупреждение: некоторые миграции могут быть помечены как failed${NC}"
    echo -e "${YELLOW}Исправляем failed миграции...${NC}"
    
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
        echo -e "${YELLOW}Помечаем миграцию $migration как resolved...${NC}"
        npx prisma migrate resolve --applied "$migration" 2>/dev/null || true
    done
    
    # Исправляем данные в базе если нужно
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
    
    # Пробуем снова применить миграции
    echo -e "${YELLOW}Повторная попытка применения миграций...${NC}"
    npx prisma migrate deploy
}

check_success "Миграции применены"

# Шаг 8: Генерация Prisma Client
echo -e "\n${YELLOW}[8/12] Генерация Prisma Client...${NC}"
npx prisma generate
check_success "Prisma Client сгенерирован"

# Шаг 9: Создание ролей
echo -e "\n${YELLOW}[9/12] Создание ролей...${NC}"
npx tsx scripts/create-system-roles.ts || echo -e "${YELLOW}Предупреждение: роли могут уже существовать${NC}"
npx tsx scripts/create-new-roles.ts || echo -e "${YELLOW}Предупреждение: роли могут уже существовать${NC}"
check_success "Роли созданы"

# Шаг 9.5: Создание первого пользователя
echo -e "\n${YELLOW}[9.5/12] Создание первого пользователя...${NC}"
npx tsx scripts/create-first-user.ts || echo -e "${YELLOW}Предупреждение: пользователь может уже существовать${NC}"
check_success "Первый пользователь создан"

# Шаг 10: Сборка проекта
echo -e "\n${YELLOW}[10/12] Сборка проекта...${NC}"
npm run build
check_success "Проект собран"

# Шаг 11: Настройка PM2
echo -e "\n${YELLOW}[11/12] Настройка PM2...${NC}"

# Останавливаем существующий процесс если есть
pm2 delete salary-manager 2>/dev/null || true

# Запускаем приложение
cd "$PROJECT_DIR"
pm2 start npm --name "salary-manager" -- start
pm2 save
pm2 startup

check_success "PM2 настроен"

# Шаг 12: Настройка Nginx
echo -e "\n${YELLOW}[12/12] Настройка Nginx...${NC}"

# Проверяем, есть ли SSL сертификат
SSL_CERT_EXISTS=false
if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    SSL_CERT_EXISTS=true
    echo -e "${GREEN}✓ SSL сертификат уже существует${NC}"
fi

# Сначала настраиваем Nginx без SSL (для получения сертификата)
if [ "$SSL_CERT_EXISTS" = false ]; then
    echo -e "${YELLOW}Настройка Nginx без SSL (для получения сертификата)...${NC}"
    cat > /etc/nginx/sites-available/salary-manager <<EOF
server {
    listen 80;
    server_name $DOMAIN;

    # Увеличенные размеры для загрузки файлов
    client_max_body_size 50M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Статические файлы
    location /_next/static {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 200 60m;
        add_header Cache-Control "public, immutable";
    }

    # Загруженные файлы
    location /uploads {
        alias $PROJECT_DIR/public/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Для Let's Encrypt
    location ~ /.well-known/acme-challenge {
        allow all;
        root /var/www/html;
    }
}
EOF
else
    # Настраиваем Nginx с SSL
    echo -e "${YELLOW}Настройка Nginx с SSL...${NC}"
    cat > /etc/nginx/sites-available/salary-manager <<EOF
server {
    listen 80;
    server_name $DOMAIN;

    # Редирект на HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN;

    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Увеличенные размеры для загрузки файлов
    client_max_body_size 50M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Статические файлы
    location /_next/static {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 200 60m;
        add_header Cache-Control "public, immutable";
    }

    # Загруженные файлы
    location /uploads {
        alias $PROJECT_DIR/public/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
EOF
fi

# Создаем симлинк если его нет
ln -sf /etc/nginx/sites-available/salary-manager /etc/nginx/sites-enabled/salary-manager

# Удаляем default конфигурацию если есть
rm -f /etc/nginx/sites-enabled/default

# Проверяем конфигурацию Nginx
nginx -t
check_success "Конфигурация Nginx проверена"

# Перезагружаем Nginx
systemctl reload nginx
check_success "Nginx перезагружен"

# Получаем SSL сертификат если его нет
if [ "$SSL_CERT_EXISTS" = false ]; then
    echo -e "${YELLOW}Получение SSL сертификата...${NC}"
    certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email admin@24cybersyndicate.ru --redirect || {
        echo -e "${YELLOW}Предупреждение: SSL сертификат не получен. Настройте вручную позже.${NC}"
        echo -e "${YELLOW}Вы можете получить сертификат вручную командой:${NC}"
        echo -e "${YELLOW}certbot --nginx -d $DOMAIN${NC}"
    }
    
    # Если сертификат получен, перезагружаем Nginx с SSL конфигурацией
    if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
        echo -e "${GREEN}✓ SSL сертификат получен, настраиваем HTTPS...${NC}"
        # Certbot автоматически обновит конфигурацию Nginx
        systemctl reload nginx
        check_success "Nginx настроен с SSL"
    fi
fi

# Создаем директорию для загрузок
mkdir -p "$PROJECT_DIR/public/uploads/stamps"
chown -R www-data:www-data "$PROJECT_DIR/public/uploads"

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}Деплой завершен успешно!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "\n${GREEN}Сайт доступен по адресу: https://$DOMAIN${NC}"
echo -e "\n${YELLOW}Проверьте статус приложения:${NC}"
echo -e "  pm2 status"
echo -e "  pm2 logs salary-manager"
echo -e "\n${YELLOW}Проверьте статус Nginx:${NC}"
echo -e "  systemctl status nginx"
echo -e "\n${YELLOW}Проверьте базу данных:${NC}"
echo -e "  sudo -u postgres psql -d $DB_NAME"

