-- AlterTable
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "tableId" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "tableLabel" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "RestaurantTable" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "zone" TEXT NOT NULL DEFAULT 'Main',
    "seats" INTEGER NOT NULL DEFAULT 4,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RestaurantTable_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "RestaurantTable_label_key" ON "RestaurantTable"("label");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "RestaurantTable_zone_sortOrder_idx" ON "RestaurantTable"("zone", "sortOrder");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Order_tableId_paymentStatus_idx" ON "Order"("tableId", "paymentStatus");

-- The till-only line pointed tableId at DiningTable. Seats live on RestaurantTable.
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_tableId_fkey";

UPDATE "Order"
SET "tableId" = NULL
WHERE "tableId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "RestaurantTable" WHERE "RestaurantTable"."id" = "Order"."tableId"
  );

ALTER TABLE "Order"
  ADD CONSTRAINT "Order_tableId_fkey"
  FOREIGN KEY ("tableId") REFERENCES "RestaurantTable"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

DROP TABLE IF EXISTS "DiningTable";
DROP TABLE IF EXISTS "DiningArea";
