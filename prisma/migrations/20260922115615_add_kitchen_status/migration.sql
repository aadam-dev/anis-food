-- CreateEnum
CREATE TYPE "KitchenStatus" AS ENUM ('QUEUED', 'COOKING', 'READY', 'SERVED');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "kitchenStatus" "KitchenStatus" NOT NULL DEFAULT 'QUEUED',
ADD COLUMN     "kitchenUpdatedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Order_kitchenStatus_createdAt_idx" ON "Order"("kitchenStatus", "createdAt");

