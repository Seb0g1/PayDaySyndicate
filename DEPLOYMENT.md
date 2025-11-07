# Инструкция по развертыванию на Ubuntu Server

## Информация о сервере
- **IP адрес**: 93.183.82.104
- **Домен**: otchet.24cybersyndicate.ru
- **Пароль root**: gkzF.t_TRSkR2N

## Шаг 1: Подключение к серверу

```bash
ssh root@93.183.82.104
```

Введите пароль: `gkzF.t_TRSkR2N`

## Шаг 2: Обновление системы

```bash
apt update && apt upgrade -y
```

## Шаг 3: Установка необходимых пакетов

```bash
# Установка Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Установка PostgreSQL
apt install -y postgresql postgresql-contrib

# Установка Nginx
apt install -y nginx

# Установка Git
apt install -y git

# Установка PM2 для управления процессами
npm install -g pm2

# Установка certbot для SSL сертификатов
apt install -y certbot python3-certbot-nginx

# Установка build-essential для компиляции нативных модулей
apt install -y build-essential
```

## Шаг 4: Настройка PostgreSQL

```bash
# Переключиться на пользователя postgres
su - postgres

# Создать базу данных и пользователя
psql

# В psql выполнить:
CREATE DATABASE salary;
CREATE USER salary_user WITH PASSWORD 'your_secure_password_here';
ALTER DATABASE salary OWNER TO salary_user;
GRANT ALL PRIVILEGES ON DATABASE salary TO salary_user;
\q

# Выйти из пользователя postgres
exit
```

**Важно**: Замените `your_secure_password_here` на надежный пароль!

## Шаг 5: Настройка файрвола (если используется)

```bash
# Разрешить SSH, HTTP, HTTPS
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

## Шаг 6: Клонирование и настройка проекта

```bash
# Создать директорию для приложения
mkdir -p /var/www
cd /var/www

# Клонировать репозиторий (замените URL на ваш репозиторий)
git clone <your-repo-url> salary-manager
cd salary-manager

# Установить зависимости
npm install

# Создать файл .env
cp env.sample .env
nano .env
```

## Шаг 7: Настройка переменных окружения (.env)

Отредактируйте `.env` файл с следующими значениями:

```env
# PostgreSQL connection string
DATABASE_URL="postgresql://salary_user:your_secure_password_here@localhost:5432/salary?schema=public"

# NextAuth/Auth.js
NEXTAUTH_URL="https://otchet.24cybersyndicate.ru"
NEXTAUTH_SECRET="generate_a_random_secret_here"

# Auth.js v5 env names
AUTH_URL="https://otchet.24cybersyndicate.ru"
AUTH_SECRET="generate_another_random_secret_here"

# Google OAuth (опционально)
AUTH_GOOGLE_ID="your-google-oauth-client-id"
AUTH_GOOGLE_SECRET="your-google-oauth-client-secret"

# App config
ALLOW_REGISTRATION="false"
ADMIN_SETUP_SECRET="generate_a_one_time_secret_here"
```

**Для генерации секретов выполните:**
```bash
openssl rand -base64 32
```

## Шаг 8: Настройка базы данных

```bash
# Генерация Prisma клиента
npx prisma generate

# Применение миграций
npx prisma migrate deploy

# (Опционально) Заполнение начальными данными, если есть скрипты
# npm run seed
```

## Шаг 9: Сборка приложения

```bash
# Сборка production версии
npm run build
```

## Шаг 10: Настройка PM2

```bash
# Создать ecosystem файл
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'salary-manager',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/salary-manager',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/pm2/salary-manager-error.log',
    out_file: '/var/log/pm2/salary-manager-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_memory_restart: '1G'
  }]
};
EOF

# Создать директорию для логов
mkdir -p /var/log/pm2

# Запустить приложение
pm2 start ecosystem.config.js

# Сохранить конфигурацию PM2
pm2 save

# Настроить автозапуск PM2 при перезагрузке
pm2 startup
# Выполните команду, которую выведет pm2 startup
```

## Шаг 11: Настройка Nginx

```bash
# Создать конфигурацию Nginx
cat > /etc/nginx/sites-available/salary-manager << 'EOF'
server {
    listen 80;
    server_name otchet.24cybersyndicate.ru;

    # Редирект на HTTPS (будет настроен после получения сертификата)
    # return 301 https://$server_name$request_uri;

    # Временная конфигурация для HTTP (до получения SSL)
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Увеличенный размер для загрузки файлов
    client_max_body_size 50M;
}
EOF

# Создать символическую ссылку
ln -s /etc/nginx/sites-available/salary-manager /etc/nginx/sites-enabled/

# Удалить дефолтную конфигурацию (опционально)
rm /etc/nginx/sites-enabled/default

# Проверить конфигурацию Nginx
nginx -t

# Перезагрузить Nginx
systemctl reload nginx
```

## Шаг 12: Настройка SSL сертификата (Let's Encrypt)

```bash
# Получить SSL сертификат
certbot --nginx -d otchet.24cybersyndicate.ru

# Следовать инструкциям certbot
# Выберите вариант 2 (Redirect) для автоматического редиректа на HTTPS
```

После получения сертификата, certbot автоматически обновит конфигурацию Nginx.

## Шаг 13: Настройка автопродления SSL сертификата

```bash
# Проверить, что автопродление настроено
certbot renew --dry-run
```

## Шаг 14: Настройка домена в DNS

Убедитесь, что в настройках DNS вашего домена добавлена A-запись:
```
otchet.24cybersyndicate.ru -> 93.183.82.104
```

## Шаг 15: Проверка работы приложения

1. Откройте в браузере: `https://otchet.24cybersyndicate.ru`
2. Убедитесь, что приложение загружается
3. Проверьте логи: `pm2 logs salary-manager`

## Управление приложением

### Просмотр логов
```bash
pm2 logs salary-manager
```

### Перезапуск приложения
```bash
pm2 restart salary-manager
```

### Остановка приложения
```bash
pm2 stop salary-manager
```

### Обновление приложения
```bash
cd /var/www/salary-manager
git pull
npm install
npx prisma generate
npx prisma migrate deploy
npm run build
pm2 restart salary-manager
```

## Резервное копирование базы данных

```bash
# Создать скрипт резервного копирования
cat > /usr/local/bin/backup-salary-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/salary-manager"
mkdir -p $BACKUP_DIR
DATE=$(date +%Y%m%d_%H%M%S)
PGPASSWORD='your_secure_password_here' pg_dump -U salary_user -h localhost salary > $BACKUP_DIR/salary_backup_$DATE.sql
# Удалить резервные копии старше 30 дней
find $BACKUP_DIR -name "salary_backup_*.sql" -mtime +30 -delete
EOF

chmod +x /usr/local/bin/backup-salary-db.sh

# Добавить в crontab (ежедневное резервное копирование в 3:00)
(crontab -l 2>/dev/null; echo "0 3 * * * /usr/local/bin/backup-salary-db.sh") | crontab -
```

**Важно**: Замените `your_secure_password_here` на ваш реальный пароль БД в скрипте резервного копирования!

## Безопасность

1. **Измените пароль root** после первоначальной настройки
2. **Настройте SSH ключи** вместо пароля
3. **Регулярно обновляйте систему**: `apt update && apt upgrade -y`
4. **Настройте fail2ban** для защиты от брутфорса:
   ```bash
   apt install -y fail2ban
   systemctl enable fail2ban
   systemctl start fail2ban
   ```

## Troubleshooting

### Приложение не запускается
```bash
# Проверить логи PM2
pm2 logs salary-manager

# Проверить логи Nginx
tail -f /var/log/nginx/error.log

# Проверить статус сервисов
systemctl status nginx
pm2 status
```

### Проблемы с базой данных
```bash
# Проверить статус PostgreSQL
systemctl status postgresql

# Подключиться к базе данных
su - postgres
psql -d salary
```

### Проблемы с портами
```bash
# Проверить, какие порты заняты
netstat -tulpn | grep :3000
netstat -tulpn | grep :80
netstat -tulpn | grep :443
```

## Контакты и поддержка

При возникновении проблем проверьте:
1. Логи приложения: `pm2 logs salary-manager`
2. Логи Nginx: `tail -f /var/log/nginx/error.log`
3. Статус сервисов: `systemctl status nginx postgresql`
4. Доступность портов: `netstat -tulpn`

