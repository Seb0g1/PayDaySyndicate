# 📋 Как посмотреть логи на сервере

## Подключение к серверу

```bash
ssh root@otchet.24cybersyndicate.ru
# или используйте ваши учетные данные
```

## Способ 1: Просмотр логов через PM2 (рекомендуется)

### Просмотр всех логов в реальном времени:
```bash
pm2 logs salary-manager
```

### Просмотр последних 100 строк:
```bash
pm2 logs salary-manager --lines 100
```

### Просмотр только ошибок:
```bash
pm2 logs salary-manager --err
```

### Просмотр только обычного вывода:
```bash
pm2 logs salary-manager --out
```

### Просмотр логов с фильтрацией по ключевому слову:
```bash
pm2 logs salary-manager | grep "langame"
pm2 logs salary-manager | grep "sync-products"
pm2 logs salary-manager | grep "active"
```

### Очистка логов и просмотр новых:
```bash
pm2 flush salary-manager
pm2 logs salary-manager
```

## Способ 2: Просмотр логов из файлов

### Просмотр файла с ошибками:
```bash
tail -f /var/log/pm2/salary-manager-error.log
```

### Просмотр файла с обычным выводом:
```bash
tail -f /var/log/pm2/salary-manager-out.log
```

### Просмотр последних 100 строк:
```bash
tail -n 100 /var/log/pm2/salary-manager-error.log
tail -n 100 /var/log/pm2/salary-manager-out.log
```

### Поиск по логам:
```bash
grep "langame" /var/log/pm2/salary-manager-out.log
grep "sync-products" /var/log/pm2/salary-manager-error.log
grep "active" /var/log/pm2/salary-manager-out.log | tail -20
```

## Способ 3: Просмотр логов Next.js (если есть)

Если логи пишутся в другие места:
```bash
# Проверьте, где находятся логи Next.js
cd /var/www/salary-manager
ls -la .next/
```

## Полезные команды для диагностики

### Проверка статуса приложения:
```bash
pm2 status
```

### Проверка информации о процессе:
```bash
pm2 info salary-manager
```

### Перезапуск приложения (после изменений):
```bash
cd /var/www/salary-manager
pm2 restart salary-manager
```

### Просмотр использования памяти и CPU:
```bash
pm2 monit
```

## Поиск конкретных ошибок

### Поиск ошибок синхронизации Langame:
```bash
pm2 logs salary-manager --lines 500 | grep -A 10 -B 10 "langame/sync-products"
```

### Поиск ошибок импорта:
```bash
pm2 logs salary-manager --lines 500 | grep -A 10 -B 10 "products/import"
```

### Поиск информации о поле active:
```bash
pm2 logs salary-manager --lines 500 | grep -A 5 "active"
```

### Поиск статистики по active:
```bash
pm2 logs salary-manager --lines 500 | grep "Active field statistics"
```

## Сохранение логов в файл

### Сохранить логи в файл:
```bash
pm2 logs salary-manager --lines 1000 > /tmp/salary-manager-logs.txt
```

### Скачать логи на локальный компьютер:
```bash
# На сервере:
pm2 logs salary-manager --lines 1000 > /tmp/logs.txt

# На локальном компьютере (в другом терминале):
scp root@otchet.24cybersyndicate.ru:/tmp/logs.txt ./logs.txt
```

## Быстрая проверка после синхронизации

После запуска синхронизации товаров выполните:

```bash
# 1. Просмотрите последние логи
pm2 logs salary-manager --lines 200

# 2. Найдите информацию о синхронизации
pm2 logs salary-manager --lines 500 | grep -A 20 "Starting product sync loop"

# 3. Найдите статистику по active
pm2 logs salary-manager --lines 500 | grep -A 10 "Active field statistics"

# 4. Найдите пропущенные товары
pm2 logs salary-manager --lines 500 | grep "Skipping inactive product" | head -20
```

## Если логи не видны

### Проверьте, что приложение запущено:
```bash
pm2 status
```

### Проверьте права доступа к файлам логов:
```bash
ls -la /var/log/pm2/
```

### Перезапустите PM2 логирование:
```bash
pm2 restart salary-manager --update-env
```

### Проверьте конфигурацию PM2:
```bash
cd /var/www/salary-manager
cat ecosystem.config.js
```

