-- CreateTable
CREATE TABLE "ShiftPenalty" (
    "id" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShiftPenalty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShiftBonus" (
    "id" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShiftBonus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShiftHookah" (
    "id" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "amountPer" DECIMAL(10,2) NOT NULL DEFAULT 200,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShiftHookah_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ShiftPenalty" ADD CONSTRAINT "ShiftPenalty_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftBonus" ADD CONSTRAINT "ShiftBonus_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftHookah" ADD CONSTRAINT "ShiftHookah_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE CASCADE ON UPDATE CASCADE;
