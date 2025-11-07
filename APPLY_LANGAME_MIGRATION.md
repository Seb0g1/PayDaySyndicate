# 🔧 Применение миграции для LangameSettings

## Проблема

Модель `LangameSettings` существует в схеме Prisma, но миграция для создания таблицы отсутствовала. Из-за этого Prisma Client не генерировал модель.

## Решение

### На сервере выполните:

```bash
cd /var/www/salary-manager

# 1. Обновите код
git pull

# 2. Остановите приложение
pm2 stop salary-manager

# 3. Удалите старый Prisma Client
rm -rf src/generated/prisma
rm -rf node_modules/.prisma
rm -rf .next

# 4. Примените миграции (включая новую для LangameSettings)
npx prisma migrate deploy

# 5. Проверьте, что таблица создана
npx prisma db pull
# Или через psql:
# psql -U salary_user -d salary -c "\d \"LangameSettings\""

# 6. Сгенерируйте Prisma Client (теперь модель должна появиться)
npx prisma generate

# 7. Проверьте, что модель создана
ls -la src/generated/prisma/models/LangameSettings.ts
# Файл должен существовать!

# 8. Проверьте, что модель доступна в client
grep "langameSettings" src/generated/prisma/internal/class.ts
# Должна быть строка: get langameSettings():

# 9. Пересоберите проект
npm run build

# 10. Перезапустите приложение
pm2 restart salary-manager

# 11. Проверьте логи
pm2 logs salary-manager
```

## Или используйте скрипт:

```bash
cd /var/www/salary-manager
git pull
chmod +x fix-prisma-client.sh
./fix-prisma-client.sh
```

## Проверка после применения миграции

```bash
# Проверить таблицу в БД
psql -U salary_user -d salary -c "SELECT * FROM \"LangameSettings\";"

# Проверить, что Prisma Client содержит модель
node -e "const { PrismaClient } = require('./src/generated/prisma/client'); const p = new PrismaClient(); console.log('langameSettings' in p ? '✅ Модель найдена' : '❌ Модель не найдена');"
```

## Важно

1. **Миграция должна быть применена** перед генерацией Prisma Client
2. **Удалите старый Prisma Client** перед генерацией нового
3. **Очистите кэш Next.js** (удалите `.next`) перед сборкой

## Если проблема сохраняется

1. Проверьте, что миграция применена:
   ```bash
   npx prisma migrate status
   ```

2. Проверьте схему:
   ```bash
   grep -A 10 "model LangameSettings" prisma/schema.prisma
   ```

3. Попробуйте пересоздать Prisma Client:
   ```bash
   rm -rf src/generated/prisma
   npx prisma generate --schema=prisma/schema.prisma
   ```

