-- AlterEnum
ALTER TYPE "OrderEventType" ADD VALUE 'EDITED';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "editCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "editedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "sizeId" TEXT,
ADD COLUMN     "sizeLabel" TEXT;

-- CreateTable
CREATE TABLE "MenuItemSize" (
    "id" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "costPrice" DECIMAL(10,2),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MenuItemSize_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MenuItemSize_menuItemId_sortOrder_idx" ON "MenuItemSize"("menuItemId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "MenuItemSize_menuItemId_label_key" ON "MenuItemSize"("menuItemId", "label");

-- AddForeignKey
ALTER TABLE "MenuItemSize" ADD CONSTRAINT "MenuItemSize_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_sizeId_fkey" FOREIGN KEY ("sizeId") REFERENCES "MenuItemSize"("id") ON DELETE SET NULL ON UPDATE CASCADE;

