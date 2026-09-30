-- Parked carts. Not sales: the kitchen and the books never see these rows.

CREATE TABLE IF NOT EXISTS "HeldCart" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "label" TEXT,
    "lines" JSONB NOT NULL,
    "discount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "customerName" TEXT,
    "customerPhone" TEXT,
    "customerAddress" TEXT,
    "fulfillment" TEXT NOT NULL DEFAULT 'TAKEAWAY',
    "tableId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HeldCart_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "HeldCart_staffId_updatedAt_idx" ON "HeldCart"("staffId", "updatedAt");

ALTER TABLE "HeldCart"
  ADD CONSTRAINT "HeldCart_staffId_fkey"
  FOREIGN KEY ("staffId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
