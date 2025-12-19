-- Add voucherQuantity column to Promotion table for limiting voucher redemptions
ALTER TABLE "Promotion" ADD COLUMN "voucherQuantity" INTEGER;

-- Add comment to clarify usage
COMMENT ON COLUMN "Promotion"."voucherQuantity" IS 'Total number of vouchers available. NULL means unlimited. Only applies to VOUCHER deal type.';
