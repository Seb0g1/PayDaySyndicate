# 🚀 Быстрый старт развертывания на Ubuntu Server

## Информация о сервере
- **IP**: 93.183.82.104
- **Домен**: otchet.24cybersyndicate.ru
- **Пароль root**: gkzF.t_TRSkR2N

## ⚡ Быстрое развертывание (автоматический скрипт)

1. **Подключитесь к серверу:**
   ```bash
   ssh root@93.183.82.104
   # Пароль: gkzF.t_TRSkR2N
   ```

2. **Клонируйте репозиторий:**
   ```bash
   mkdir -p /var/www
   cd /var/www
   git clone <ваш-репозиторий> salary-manager
   cd salary-manager
   ```

3. **Запустите скрипт развертывания:**
   ```bash
   chmod +x deploy.sh
   ./deploy.sh
   ```

4. **Следуйте инструкциям скрипта** (введите пароль для БД, настройте .env файл)

## 📝 Ручное развертывание (пошагово)

### Шаг 1: Подготовка сервера
```bash
ssh root@93.183.82.104
apt update && apt upgrade -y
```

### Шаг 2: Установка пакетов
```bash
# Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs postgresql postgresql-contrib nginx git build-essential
npm install -g pm2
apt install -y certbot python3-certbot-nginx
```

### Шаг 3: Настройка PostgreSQL
```bash
su - postgres
psql

# В psql:
CREATE DATABASE salary;
CREATE USER salary_user WITH PASSWORD 'ваш_надежный_пароль';
ALTER DATABASE salary OWNER TO salary_user;
GRANT ALL PRIVILEGES ON DATABASE salary TO salary_user;
\q
exit
```

### Шаг 4: Настройка приложения
```bash
cd /var/www/salary-manager
npm install
cp env.sample .env
nano .env  # Отредактируйте файл (см. ниже)
```

### Шаг 5: Настройка .env файла
```env
DATABASE_URL="postgresql://salary_user:ваш_пароль@localhost:5432/salary?schema=public"
NEXTAUTH_URL="https://otchet.24cybersyndicate.ru"
AUTH_URL="https://otchet.24cybersyndicate.ru"
NEXTAUTH_SECRET="$(openssl rand -base64 32)"
AUTH_SECRET="$(openssl rand -base64 32)"
ALLOW_REGISTRATION="false"
ADMIN_SETUP_SECRET="$(openssl rand -base64 32)"
```

**Сгенерируйте секреты:**
```bash
openssl rand -base64 32  # Выполните 3 раза для NEXTAUTH_SECRET, AUTH_SECRET, ADMIN_SETUP_SECRET
```

### Шаг 6: База данных и сборка
```bash
npx prisma generate
npx prisma migrate deploy
npm run build
```

### Шаг 7: Запуск с PM2
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # Выполните команду, которую выведет PM2
```

### Шаг 8: Настройка Nginx
```bash
cp nginx.conf /etc/nginx/sites-available/salary-manager
ln -s /etc/nginx/sites-available/salary-manager /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
```

### Шаг 9: Настройка DNS
Добавьте A-запись в настройках DNS:
```
otchet.24cybersyndicate.ru → 93.183.82.104
```

### Шаг 10: SSL сертификат
```bash
certbot --nginx -d otchet.24cybersyndicate.ru
# Выберите вариант 2 (Redirect) для автоматического редиректа на HTTPS
```

## ✅ Проверка работы

Откройте в браузере: `https://otchet.24cybersyndicate.ru`

## 🔧 Управление приложением

```bash
# Логи
pm2 logs salary-manager

# Перезапуск
pm2 restart salary-manager

# Статус
pm2 status

# Обновление приложения
cd /var/www/salary-manager
git pull
npm install
npx prisma generate
npx prisma migrate deploy
npm run build
pm2 restart salary-manager
```

## 📦 Резервное копирование БД

```bash
# Создать скрипт
cat > /usr/local/bin/backup-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/salary-manager"
mkdir -p $BACKUP_DIR
DATE=$(date +%Y%m%d_%H%M%S)
PGPASSWORD='ваш_пароль' pg_dump -U salary_user -h localhost salary > $BACKUP_DIR/backup_$DATE.sql
find $BACKUP_DIR -name "backup_*.sql" -mtime +30 -delete
EOF

chmod +x /usr/local/bin/backup-db.sh

# Автоматическое резервное копирование (ежедневно в 3:00)
(crontab -l 2>/dev/null; echo "0 3 * * * /usr/local/bin/backup-db.sh") | crontab -
```

## 🔒 Безопасность

1. **Измените пароль root** после настройки
2. **Настройте SSH ключи** вместо пароля
3. **Установите fail2ban:**
   ```bash
   apt install -y fail2ban
   systemctl enable fail2ban
   systemctl start fail2ban
   ```

## 🆘 Решение проблем

### Приложение не работает
```bash
pm2 logs salary-manager
tail -f /var/log/nginx/error.log
systemctl status nginx postgresql
```

### Проблемы с БД
```bash
systemctl status postgresql
su - postgres
psql -d salary
```

## 📚 Полная инструкция

Подробная инструкция находится в файле [DEPLOYMENT.md](./DEPLOYMENT.md)

## ✨ PostgreSQL локально

**Да, PostgreSQL можно установить локально на сервере** - это не требует покупки отдельной БД. Все настройки в инструкции предусматривают локальную установку PostgreSQL на том же сервере, где работает приложение.

