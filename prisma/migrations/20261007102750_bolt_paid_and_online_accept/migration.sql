-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "acceptedAt" TIMESTAMP(3),
ADD COLUMN     "platformFee" DECIMAL(10,2);


-- Bolt sales are paid sales: the customer paid Bolt. Earlier ones were held as
-- "awaiting payout"; mark them paid, with Bolt's 20% commission as their fee.
UPDATE "Order"
SET "paymentStatus" = 'PAID',
    "status" = 'COMPLETED',
    "platformFee" = ROUND("total" * 0.20, 2)
WHERE "paymentMethod" = 'BOLT_FOOD'
  AND "paymentStatus" = 'PENDING'
  AND "status" <> 'CANCELLED';

-- Online orders already on the books count as accepted, so the new alert only
-- rings for orders that arrive from now on.
UPDATE "Order" SET "acceptedAt" = "createdAt" WHERE "source" = 'ONLINE' AND "acceptedAt" IS NULL;
