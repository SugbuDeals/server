-- Create VoucherRedemptionStatus enum
CREATE TYPE "VoucherRedemptionStatus" AS ENUM ('PENDING', 'VERIFIED', 'REDEEMED', 'CANCELLED');

-- Create VoucherRedemption table
CREATE TABLE "VoucherRedemption" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "promotionId" INTEGER NOT NULL,
    "storeId" INTEGER NOT NULL,
    "productId" INTEGER,
    "status" "VoucherRedemptionStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "redeemedAt" TIMESTAMP(3),

    CONSTRAINT "VoucherRedemption_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint for one redemption per user per voucher per store
CREATE UNIQUE INDEX "VoucherRedemption_userId_promotionId_storeId_key" ON "VoucherRedemption"("userId", "promotionId", "storeId");

-- Create indexes for better query performance
CREATE INDEX "VoucherRedemption_userId_idx" ON "VoucherRedemption"("userId");
CREATE INDEX "VoucherRedemption_promotionId_idx" ON "VoucherRedemption"("promotionId");
CREATE INDEX "VoucherRedemption_storeId_idx" ON "VoucherRedemption"("storeId");
CREATE INDEX "VoucherRedemption_status_idx" ON "VoucherRedemption"("status");






