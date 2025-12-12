-- CreateEnum
CREATE TYPE "DealType" AS ENUM ('PERCENTAGE_DISCOUNT', 'FIXED_DISCOUNT', 'BOGO', 'BUNDLE', 'QUANTITY_DISCOUNT');

-- AlterTable: Add new columns to Promotion table
ALTER TABLE "Promotion" ADD COLUMN "dealType" "DealType",
ADD COLUMN "percentageOff" DOUBLE PRECISION,
ADD COLUMN "fixedAmountOff" DOUBLE PRECISION,
ADD COLUMN "buyQuantity" INTEGER,
ADD COLUMN "getQuantity" INTEGER,
ADD COLUMN "bundlePrice" DOUBLE PRECISION,
ADD COLUMN "minQuantity" INTEGER,
ADD COLUMN "quantityDiscount" DOUBLE PRECISION;

-- Migrate existing data: Convert old 'type' and 'discount' to new structure
-- Assuming existing promotions used percentage discounts, map them to PERCENTAGE_DISCOUNT
UPDATE "Promotion" 
SET "dealType" = 'PERCENTAGE_DISCOUNT',
    "percentageOff" = "discount"
WHERE "dealType" IS NULL;

-- Make dealType NOT NULL after data migration
ALTER TABLE "Promotion" ALTER COLUMN "dealType" SET NOT NULL;

-- Drop old columns
ALTER TABLE "Promotion" DROP COLUMN "type",
DROP COLUMN "discount";

-- AlterTable: Add productRole to PromotionProduct
ALTER TABLE "PromotionProduct" ADD COLUMN "productRole" TEXT DEFAULT 'default';

