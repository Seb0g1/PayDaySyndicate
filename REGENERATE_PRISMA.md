# Инструкция по регенерации Prisma Client

## Проблема
Ошибка `Cannot read properties of undefined (reading 'findMany')` возникает потому, что Prisma Client не был сгенерирован после добавления модели `Role` в схему.

## Решение

1. **Остановите dev-сервер** (если он запущен):
   - Нажмите `Ctrl+C` в терминале, где запущен `npm run dev`

2. **Сгенерируйте Prisma Client**:
   ```bash
   npx prisma generate
   ```

3. **Примените миграции** (если еще не применены):
   ```bash
   npx prisma migrate deploy
   ```
   Или для разработки:
   ```bash
   npx prisma migrate dev
   ```

4. **Запустите dev-сервер снова**:
   ```bash
   npm run dev
   ```

## Альтернативное решение (если ошибка EPERM)

Если файл все еще заблокирован:

1. Закройте все процессы Node.js и редакторы кода
2. Удалите папку `.next`:
   ```bash
   rm -rf .next
   ```
   Или на Windows:
   ```bash
   rmdir /s /q .next
   ```

3. Удалите `src/generated/prisma`:
   ```bash
   rm -rf src/generated/prisma
   ```
   Или на Windows:
   ```bash
   rmdir /s /q src\generated\prisma
   ```

4. Запустите `npx prisma generate` снова

5. Запустите `npm run dev`

