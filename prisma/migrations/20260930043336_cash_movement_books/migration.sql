-- CreateEnum
CREATE TYPE "CashMovementKind" AS ENUM ('IN', 'SPEND', 'DEPOSIT');

-- CreateEnum
CREATE TYPE "DepositDestination" AS ENUM ('MOMO', 'BANK');

-- AlterTable
ALTER TABLE "CashMovement" ADD COLUMN     "destination" "DepositDestination",
ADD COLUMN     "expenseId" TEXT,
ADD COLUMN     "kind" "CashMovementKind" NOT NULL DEFAULT 'IN';

-- Cash that already left the drawer was a spend, not float coming in.
UPDATE "CashMovement" SET "kind" = 'SPEND' WHERE "direction" = 'OUT';

-- CreateIndex
CREATE UNIQUE INDEX "CashMovement_expenseId_key" ON "CashMovement"("expenseId");

-- CreateIndex
CREATE INDEX "CashMovement_kind_idx" ON "CashMovement"("kind");

-- AddForeignKey
ALTER TABLE "CashMovement" ADD CONSTRAINT "CashMovement_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE SET NULL ON UPDATE CASCADE;

