-- AlterTable
ALTER TABLE "InventoryCountHistory" ADD COLUMN "archived" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Shortage" ADD COLUMN "inventoryCountId" TEXT;

-- CreateIndex
CREATE INDEX "Shortage_inventoryCountId_idx" ON "Shortage"("inventoryCountId");

-- AddForeignKey
ALTER TABLE "Shortage" ADD CONSTRAINT "Shortage_inventoryCountId_fkey" FOREIGN KEY ("inventoryCountId") REFERENCES "InventoryCountHistory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

