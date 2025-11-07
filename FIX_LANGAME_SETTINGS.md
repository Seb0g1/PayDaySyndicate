# 🔧 Исправление ошибки "Property 'langameSettings' does not exist"

## Проблема

Ошибка возникает, когда Prisma Client на сервере не содержит модель `langameSettings`. Это происходит, если Prisma Client не был пересгенерирован после обновления кода.

## Решение (выполните на сервере)

### Вариант 1: Использование скрипта (рекомендуется)

```bash
cd /var/www/salary-manager
chmod +x fix-prisma-client.sh
./fix-prisma-client.sh
```

### Вариант 2: Ручное исправление

```bash
cd /var/www/salary-manager

# 1. Остановить приложение
pm2 stop salary-manager

# 2. Полностью удалить старый Prisma Client
rm -rf src/generated/prisma
rm -rf node_modules/.prisma
rm -rf .next

# 3. Обновить код (если еще не обновлен)
git pull

# 4. Установить зависимости (если нужно)
npm install

# 5. Сгенерировать Prisma Client заново
npx prisma generate

# 6. Проверить, что модель создана
ls -la src/generated/prisma/models/LangameSettings.ts
# Файл должен существовать

# 7. Проверить, что модель доступна в client.ts
grep -i "langameSettings" src/generated/prisma/internal/class.ts
# Должна быть строка: get langameSettings():

# 8. Применить миграции
npx prisma migrate deploy

# 9. Пересобрать проект
npm run build

# 10. Перезапустить приложение
pm2 restart salary-manager

# 11. Проверить логи
pm2 logs salary-manager
```

## Проверка после исправления

```bash
# Проверить, что модель доступна
cd /var/www/salary-manager
node -e "const { PrismaClient } = require('./src/generated/prisma/client'); const p = new PrismaClient(); console.log('langameSettings' in p ? '✅ Модель найдена' : '❌ Модель не найдена');"
```

## Если проблема сохраняется

1. **Проверьте схему Prisma:**
   ```bash
   grep -A 10 "model LangameSettings" prisma/schema.prisma
   ```

2. **Проверьте конфигурацию генератора:**
   ```bash
   grep -A 3 "generator client" prisma/schema.prisma
   ```
   
   Должно быть:
   ```prisma
   generator client {
     provider = "prisma-client"
     output   = "../src/generated/prisma"
   }
   ```

3. **Попробуйте удалить node_modules и переустановить:**
   ```bash
   rm -rf node_modules
   npm install
   npx prisma generate
   ```

4. **Проверьте версию Prisma:**
   ```bash
   npx prisma --version
   npm list prisma @prisma/client
   ```

## Дополнительная диагностика

Если ничего не помогает, проверьте:

```bash
# Проверить, что Prisma Client правильно импортируется
cd /var/www/salary-manager
node -e "
const { PrismaClient } = require('./src/generated/prisma/client');
const prisma = new PrismaClient();
console.log('Доступные модели:', Object.keys(prisma).filter(k => !k.startsWith('_') && !k.startsWith('$')));
"
```

Должна быть модель `langameSettings` в списке.

