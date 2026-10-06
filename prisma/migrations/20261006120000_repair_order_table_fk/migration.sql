-- Repair for databases that took the till-only branch, where Order.tableId
-- pointed at a DiningTable. This used to live inside the restaurant-tables
-- migration, but editing an applied migration breaks its checksum, so the
-- repair stands on its own. Every statement is safe to re-run, and it changes
-- nothing on a database that never had DiningTable.

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
