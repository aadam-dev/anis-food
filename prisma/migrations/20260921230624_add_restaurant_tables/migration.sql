-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "tableId" TEXT,
ADD COLUMN     "tableLabel" TEXT;

-- CreateTable
CREATE TABLE "RestaurantTable" (
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
CREATE UNIQUE INDEX "RestaurantTable_label_key" ON "RestaurantTable"("label");

-- CreateIndex
CREATE INDEX "RestaurantTable_zone_sortOrder_idx" ON "RestaurantTable"("zone", "sortOrder");

-- CreateIndex
CREATE INDEX "Order_tableId_paymentStatus_idx" ON "Order"("tableId", "paymentStatus");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "RestaurantTable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

