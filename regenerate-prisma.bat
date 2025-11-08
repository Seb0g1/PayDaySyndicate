@echo off
echo Stopping any running processes...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo Regenerating Prisma Client...
npx prisma generate

echo Done! You can now start the dev server with: npm run dev

