-- DropForeignKey
ALTER TABLE "public"."SalaryLine" DROP CONSTRAINT "SalaryLine_employeeId_fkey";

-- AddForeignKey
ALTER TABLE "SalaryLine" ADD CONSTRAINT "SalaryLine_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
