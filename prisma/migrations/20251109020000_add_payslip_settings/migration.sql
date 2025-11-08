-- AlterTable
ALTER TABLE "SiteSettings" ADD COLUMN "payslipShowStamp" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "SiteSettings" ADD COLUMN "payslipBorderColor" TEXT NOT NULL DEFAULT '#000000';

-- AlterTable
ALTER TABLE "SiteSettings" ADD COLUMN "payslipWatermark" TEXT;

