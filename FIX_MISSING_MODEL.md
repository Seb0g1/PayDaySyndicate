# 🔧 Исправление: Модель LangameSettings не генерируется

## Проблема

После выполнения `npx prisma generate` файл `src/generated/prisma/models/LangameSettings.ts` не создается.

## Диагностика

Сначала выполните диагностику:

```bash
cd /var/www/salary-manager
chmod +x diagnose-prisma.sh
./diagnose-prisma.sh
```

## Решение (пошагово)

### Шаг 1: Проверьте схему

```bash
cd /var/www/salary-manager
grep -A 12 "model LangameSettings" prisma/schema.prisma
```

Должна быть модель `LangameSettings`. Если её нет, обновите код:
```bash
git pull
```

### Шаг 2: Примените миграцию

```bash
# Проверьте статус миграций
npx prisma migrate status

# Примените все миграции
npx prisma migrate deploy
```

### Шаг 3: Полностью удалите старый Prisma Client

```bash
# Остановите приложение
pm2 stop salary-manager

# Удалите все сгенерированные файлы
rm -rf src/generated/prisma
rm -rf node_modules/.prisma
rm -rf .next
```

### Шаг 4: Сгенерируйте Prisma Client заново

```bash
# Сгенерируйте Prisma Client
npx prisma generate

# Проверьте вывод - не должно быть ошибок
```

### Шаг 5: Проверьте результат

```bash
# Проверьте, что файл создан
ls -la src/generated/prisma/models/LangameSettings.ts

# Если файл не существует, проверьте все модели
ls -la src/generated/prisma/models/

# Проверьте, что модель доступна в client
grep "langameSettings" src/generated/prisma/internal/class.ts
```

### Шаг 6: Если модель все еще не генерируется

Попробуйте принудительную перегенерацию:

```bash
# Удалите все
rm -rf src/generated/prisma
rm -rf node_modules/.prisma
rm -rf node_modules/@prisma

# Переустановите зависимости
npm install

# Сгенерируйте заново
npx prisma generate --schema=prisma/schema.prisma

# Проверьте версию Prisma
npx prisma --version
npm list prisma @prisma/client
```

### Шаг 7: Проверьте таблицу в БД

```bash
# Проверьте, что таблица существует в БД
psql -U salary_user -d salary -c "\d \"LangameSettings\""

# Если таблицы нет, примените миграцию вручную
psql -U salary_user -d salary -f prisma/migrations/20251105140000_add_langame_settings/migration.sql
```

## Полное решение (одной командой)

```bash
cd /var/www/salary-manager

# 1. Обновите код
git pull

# 2. Остановите приложение
pm2 stop salary-manager

# 3. Удалите все сгенерированные файлы
rm -rf src/generated/prisma
rm -rf node_modules/.prisma
rm -rf node_modules/@prisma
rm -rf .next

# 4. Переустановите зависимости
npm install

# 5. Примените миграции
npx prisma migrate deploy

# 6. Сгенерируйте Prisma Client
npx prisma generate

# 7. Проверьте результат
ls -la src/generated/prisma/models/LangameSettings.ts
grep "langameSettings" src/generated/prisma/internal/class.ts

# 8. Пересоберите проект
npm run build

# 9. Перезапустите приложение
pm2 restart salary-manager
```

## Возможные причины

1. **Миграция не применена** - таблица не существует в БД
2. **Старый Prisma Client** - кэш не очищен
3. **Неправильная версия Prisma** - несовместимость версий
4. **Ошибка в схеме** - синтаксическая ошибка в модели
5. **Проблемы с правами доступа** - нет прав на запись в папку

## Проверка после исправления

```bash
# Проверьте, что модель доступна
node -e "const { PrismaClient } = require('./src/generated/prisma/client'); const p = new PrismaClient(); console.log('langameSettings' in p ? '✅ Модель найдена' : '❌ Модель не найдена');"
```

