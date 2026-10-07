-- CreateEnum
CREATE TYPE "MoneyAccount" AS ENUM ('TILL', 'SAFE', 'MOMO', 'BANK');

-- CreateEnum
CREATE TYPE "MoneyEntryKind" AS ENUM ('OPENING_BALANCE', 'TRANSFER', 'BOLT_PAYOUT', 'WITHDRAWAL', 'CAPITAL', 'ADJUSTMENT');

-- AlterEnum
ALTER TYPE "CashMovementKind" ADD VALUE 'WAGES';

-- AlterEnum
ALTER TYPE "DepositDestination" ADD VALUE 'SAFE';

-- DropForeignKey
ALTER TABLE "PayrollRecord" DROP CONSTRAINT "PayrollRecord_userId_fkey";

-- AlterTable
ALTER TABLE "CashMovement" ADD COLUMN     "payrollId" TEXT;

-- AlterTable
ALTER TABLE "PayrollRecord" ADD COLUMN     "paidById" TEXT,
ADD COLUMN     "paidFrom" "MoneyAccount",
ADD COLUMN     "staffId" TEXT,
ALTER COLUMN "userId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Staff" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" TEXT NOT NULL DEFAULT '',
    "phone" TEXT,
    "photoUrl" TEXT,
    "payType" "SalaryType" NOT NULL DEFAULT 'MONTHLY',
    "payRate" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "momoNumber" TEXT,
    "bankName" TEXT,
    "bankAccount" TEXT,
    "ssnit" BOOLEAN NOT NULL DEFAULT false,
    "startedAt" DATE,
    "endedAt" DATE,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MoneyEntry" (
    "id" TEXT NOT NULL,
    "account" "MoneyAccount" NOT NULL,
    "direction" "CashDirection" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "kind" "MoneyEntryKind" NOT NULL,
    "reason" TEXT NOT NULL,
    "transferId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MoneyEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Staff_userId_key" ON "Staff"("userId");

-- CreateIndex
CREATE INDEX "Staff_isActive_name_idx" ON "Staff"("isActive", "name");

-- CreateIndex
CREATE INDEX "MoneyEntry_account_occurredAt_idx" ON "MoneyEntry"("account", "occurredAt");

-- CreateIndex
CREATE INDEX "MoneyEntry_transferId_idx" ON "MoneyEntry"("transferId");

-- CreateIndex
CREATE UNIQUE INDEX "CashMovement_payrollId_key" ON "CashMovement"("payrollId");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollRecord_staffId_periodStart_key" ON "PayrollRecord"("staffId", "periodStart");

-- AddForeignKey
ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_payrollId_fkey" FOREIGN KEY ("payrollId") REFERENCES "PayrollRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollRecord" ADD CONSTRAINT "PayrollRecord_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollRecord" ADD CONSTRAINT "PayrollRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Staff" ADD CONSTRAINT "Staff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Staff are people, not logins. Everyone who works the till or has pay
-- details becomes a staff member, linked to their login. Owners and IT
-- without pay details stay users only.
INSERT INTO "Staff" ("id", "name", "position", "phone", "payType", "payRate", "momoNumber", "bankName", "bankAccount",
                     "startedAt", "isActive", "notes", "userId", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text,
       u."name",
       CASE u."role" WHEN 'CASHIER' THEN 'Cashier' WHEN 'MANAGER' THEN 'Manager' WHEN 'ACCOUNTANT' THEN 'Accountant' ELSE '' END,
       p."phone",
       COALESCE(p."salaryType", 'MONTHLY'),
       COALESCE(p."salaryAmount", 0),
       p."momoNumber",
       p."bankName",
       p."bankAccount",
       p."startedAt"::date,
       u."isActive",
       p."notes",
       u."id",
       now(),
       now()
FROM "User" u
LEFT JOIN "StaffProfile" p ON p."userId" = u."id"
WHERE p."id" IS NOT NULL OR u."role" IN ('CASHIER', 'MANAGER');

-- Payslips follow the person.
UPDATE "PayrollRecord" r
SET "staffId" = s."id"
FROM "Staff" s
WHERE s."userId" = r."userId" AND r."staffId" IS NULL;
