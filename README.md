## Salary Manager

Full-stack app built with Next.js (App Router, TypeScript), Prisma + PostgreSQL, NextAuth (credentials + Google), and Tailwind CSS.

### Features
- Employees: add/edit/delete, search/filter, per-employee links
- Shifts: calendar scheduling, attendance, hours auto-calc
- Inventory & Debts: products CRUD, record employee debts
- Shortages: record discrepancies, fuzzy suggestions (Fuse.js), assign or general loss
- Salaries: date range calc, gross − debts − shortages, PDF payslips, batch draft/finalize

### 1) Setup
1. Copy env
```bash
cp env.sample .env
```
2. Fill `.env` with your PostgreSQL `DATABASE_URL`, `AUTH_SECRET` (or `NEXTAUTH_SECRET`), and Google OAuth client credentials.
3. Generate Prisma client (and optionally run migrations)
```bash
npx prisma generate
# then when DB is ready
npx prisma migrate dev --name init
```
4. Start dev server
```bash
npm run dev
```

Open `http://localhost:3000`. Visit `/register` once to create the first admin (set `ALLOW_REGISTRATION=true` in `.env`). Then set `ALLOW_REGISTRATION=false`.

### 2) Auth
- Email/password via Credentials provider (passwords are hashed with bcryptjs)
- Google OAuth (set `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`)

### 3) Deploy (Vercel)
1. Push this repository to Git
2. Create a Vercel project and import repo
3. Add Environment Variables in Vercel: `DATABASE_URL`, `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `ALLOW_REGISTRATION=false`, `NEXTAUTH_URL`
4. Deploy

Notes:
- Role-based access: middleware protects authenticated routes; admin-only actions are enforced via UI in this MVP. Harden API checks as needed.
- PDF generation uses `@react-pdf/renderer` client-side for payslips.
