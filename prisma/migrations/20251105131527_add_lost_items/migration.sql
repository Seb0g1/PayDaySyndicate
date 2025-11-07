-- CreateEnum
CREATE TYPE "LostItemStatus" AS ENUM ('LOST', 'RETRIEVED');

-- AlterTable
ALTER TABLE "TelegramSettings" ADD COLUMN     "topicLostItems" TEXT;

-- CreateTable
CREATE TABLE "LostItem" (
    "id" TEXT NOT NULL,
    "pcNumber" TEXT,
    "guestPhone" TEXT,
    "guestName" TEXT,
    "photos" TEXT[],
    "location" TEXT,
    "status" "LostItemStatus" NOT NULL DEFAULT 'LOST',
    "createdById" TEXT NOT NULL,
    "retrievedById" TEXT,
    "retrievedAt" TIMESTAMP(3),
    "telegramMessageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LostItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LostItem_status_idx" ON "LostItem"("status");

-- CreateIndex
CREATE INDEX "LostItem_createdById_idx" ON "LostItem"("createdById");

-- AddForeignKey
ALTER TABLE "LostItem" ADD CONSTRAINT "LostItem_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LostItem" ADD CONSTRAINT "LostItem_retrievedById_fkey" FOREIGN KEY ("retrievedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
