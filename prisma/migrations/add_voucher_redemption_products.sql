-- Create VoucherRedemptionProduct table for multiple products per voucher redemption
CREATE TABLE "VoucherRedemptionProduct" (
    "id" SERIAL NOT NULL,
    "voucherRedemptionId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VoucherRedemptionProduct_pkey" PRIMARY KEY ("id")
);

-- Create foreign key constraints
ALTER TABLE "VoucherRedemptionProduct" 
ADD CONSTRAINT "VoucherRedemptionProduct_voucherRedemptionId_fkey" 
FOREIGN KEY ("voucherRedemptionId") 
REFERENCES "VoucherRedemption"("id") 
ON UPDATE CASCADE 
ON DELETE CASCADE;

ALTER TABLE "VoucherRedemptionProduct" 
ADD CONSTRAINT "VoucherRedemptionProduct_productId_fkey" 
FOREIGN KEY ("productId") 
REFERENCES "Product"("id") 
ON UPDATE CASCADE 
ON DELETE CASCADE;

-- Create unique constraint to prevent duplicate products in same redemption
CREATE UNIQUE INDEX "VoucherRedemptionProduct_voucherRedemptionId_productId_key" 
ON "VoucherRedemptionProduct"("voucherRedemptionId", "productId");

-- Create indexes for better query performance
CREATE INDEX "VoucherRedemptionProduct_voucherRedemptionId_idx" 
ON "VoucherRedemptionProduct"("voucherRedemptionId");

CREATE INDEX "VoucherRedemptionProduct_productId_idx" 
ON "VoucherRedemptionProduct"("productId");
