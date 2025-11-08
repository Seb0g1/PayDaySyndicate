-- CreateTable
CREATE TABLE "SiteSettings" (
    "id" TEXT NOT NULL,
    "siteName" TEXT NOT NULL DEFAULT 'PayDay Syndicate',
    "theme" TEXT NOT NULL DEFAULT 'dark',
    "enableEmployees" BOOLEAN NOT NULL DEFAULT true,
    "enableShifts" BOOLEAN NOT NULL DEFAULT true,
    "enableProducts" BOOLEAN NOT NULL DEFAULT true,
    "enableDebts" BOOLEAN NOT NULL DEFAULT true,
    "enableShortages" BOOLEAN NOT NULL DEFAULT true,
    "enableSalaries" BOOLEAN NOT NULL DEFAULT true,
    "enableReports" BOOLEAN NOT NULL DEFAULT true,
    "enableTasks" BOOLEAN NOT NULL DEFAULT true,
    "enableChecklist" BOOLEAN NOT NULL DEFAULT true,
    "enableLostItems" BOOLEAN NOT NULL DEFAULT true,
    "enableMemos" BOOLEAN NOT NULL DEFAULT true,
    "enablePayments" BOOLEAN NOT NULL DEFAULT true,
    "enablePcManagement" BOOLEAN NOT NULL DEFAULT true,
    "enableProductOrder" BOOLEAN NOT NULL DEFAULT true,
    "enableLangame" BOOLEAN NOT NULL DEFAULT true,
    "enableTelegram" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SiteSettings_id_key" ON "SiteSettings"("id");

-- Insert default settings
INSERT INTO "SiteSettings" ("id", "siteName", "theme") VALUES ('default', 'PayDay Syndicate', 'dark');

