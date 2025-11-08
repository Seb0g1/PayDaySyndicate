-- AlterTable
ALTER TABLE "SiteSettings" ADD COLUMN "siteIcon" TEXT DEFAULT 'PS';

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN "userRole" "UserRole";

-- CreateTable
CREATE TABLE "EmployeePermission" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "permission" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeePermission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmployeePermission_employeeId_permission_key" ON "EmployeePermission"("employeeId", "permission");

-- CreateIndex
CREATE INDEX "EmployeePermission_employeeId_idx" ON "EmployeePermission"("employeeId");

-- AddForeignKey
ALTER TABLE "EmployeePermission" ADD CONSTRAINT "EmployeePermission_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

