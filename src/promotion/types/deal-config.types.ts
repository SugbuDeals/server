/**
 * Deal Configuration Types
 * 
 * Type definitions for different deal types in the promotion system.
 * Uses discriminated unions for type-safe deal configurations.
 */

import { DealType } from 'generated/prisma';

/**
 * Discriminated union for type-safe deal configurations.
 * Each configuration extends the base deal type with specific fields.
 */
export type DealConfiguration =
  | PercentageDiscountConfig
  | FixedDiscountConfig
  | BogoDealConfig
  | BundleDealConfig
  | QuantityDiscountConfig
  | VoucherConfig;

/**
 * Percentage Discount Configuration
 * 
 * Applies a percentage discount to products.
 * 
 * @example
 * ```typescript
 * {
 *   dealType: 'PERCENTAGE_DISCOUNT',
 *   percentageOff: 25  // 25% off
 * }
 * ```
 */
export interface PercentageDiscountConfig {
  dealType: 'PERCENTAGE_DISCOUNT';
  percentageOff: number; // 0-100
}

/**
 * Fixed Discount Configuration
 * 
 * Applies a fixed amount discount to products.
 * 
 * @example
 * ```typescript
 * {
 *   dealType: 'FIXED_DISCOUNT',
 *   fixedAmountOff: 10  // $10 off
 * }
 * ```
 */
export interface FixedDiscountConfig {
  dealType: 'FIXED_DISCOUNT';
  fixedAmountOff: number; // must be > 0
}

/**
 * Buy One Get One (BOGO) Deal Configuration
 * 
 * Buy X items, get Y items free.
 * Products are split: first buyQuantity products are "buy", rest are "get".
 * 
 * @example
 * ```typescript
 * {
 *   dealType: 'BOGO',
 *   buyQuantity: 1,   // Buy 1
 *   getQuantity: 1    // Get 1 free (Buy 1 Get 1)
 * }
 * ```
 */
export interface BogoDealConfig {
  dealType: 'BOGO';
  buyQuantity: number; // e.g., 1
  getQuantity: number; // e.g., 1 (for Buy 1 Get 1)
}

/**
 * Bundle Deal Configuration
 * 
 * Buy multiple products together for a fixed price.
 * 
 * @example
 * ```typescript
 * {
 *   dealType: 'BUNDLE',
 *   bundlePrice: 50  // All bundle products for $50
 * }
 * ```
 */
export interface BundleDealConfig {
  dealType: 'BUNDLE';
  bundlePrice: number; // Fixed price for entire bundle
}

/**
 * Quantity-based Discount Configuration
 * 
 * Get a discount when purchasing a minimum quantity.
 * 
 * @example
 * ```typescript
 * {
 *   dealType: 'QUANTITY_DISCOUNT',
 *   minQuantity: 3,        // Buy 3 or more
 *   quantityDiscount: 20   // Get 20% off
 * }
 * ```
 */
export interface QuantityDiscountConfig {
  dealType: 'QUANTITY_DISCOUNT';
  minQuantity: number; // Minimum quantity to qualify (must be > 1)
  quantityDiscount: number; // Percentage off when min quantity met (0-100)
}

/**
 * Voucher Configuration
 * 
 * A fixed monetary value that can be applied to products (like a gift card).
 * 
 * @example
 * ```typescript
 * {
 *   dealType: 'VOUCHER',
 *   voucherValue: 50  // $50 voucher
 * }
 * ```
 */
export interface VoucherConfig {
  dealType: 'VOUCHER';
  voucherValue: number; // Fixed monetary value (must be > 0)
}

/**
 * Type guard to check if a config is a percentage discount
 */
export function isPercentageDiscount(
  config: DealConfiguration,
): config is PercentageDiscountConfig {
  return config.dealType === 'PERCENTAGE_DISCOUNT';
}

/**
 * Type guard to check if a config is a fixed discount
 */
export function isFixedDiscount(
  config: DealConfiguration,
): config is FixedDiscountConfig {
  return config.dealType === 'FIXED_DISCOUNT';
}

/**
 * Type guard to check if a config is a BOGO deal
 */
export function isBogoDeal(
  config: DealConfiguration,
): config is BogoDealConfig {
  return config.dealType === 'BOGO';
}

/**
 * Type guard to check if a config is a bundle deal
 */
export function isBundleDeal(
  config: DealConfiguration,
): config is BundleDealConfig {
  return config.dealType === 'BUNDLE';
}

/**
 * Type guard to check if a config is a quantity discount
 */
export function isQuantityDiscount(
  config: DealConfiguration,
): config is QuantityDiscountConfig {
  return config.dealType === 'QUANTITY_DISCOUNT';
}

/**
 * Type guard to check if a config is a voucher
 */
export function isVoucher(
  config: DealConfiguration,
): config is VoucherConfig {
  return config.dealType === 'VOUCHER';
}

