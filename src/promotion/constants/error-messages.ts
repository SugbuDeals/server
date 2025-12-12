/**
 * Promotion Error Messages
 * 
 * Centralized error messages for promotion validation and business logic.
 * Provides clear, actionable error messages for all deal types.
 */

/**
 * Error messages for promotion validation
 */
export const PROMOTION_ERRORS = {
  // General errors
  USER_NOT_FOUND: 'User not found',
  PROMOTION_NOT_FOUND: 'Promotion not found',
  PRODUCTS_NOT_FOUND: 'One or more products not found',
  UNAUTHORIZED_PRODUCTS:
    'You can only create promotions for products in your own stores',
  ALL_PRODUCTS_ALREADY_IN_PROMOTION:
    'All products are already in this promotion',

  // Deal type validation errors
  INVALID_DEAL_TYPE: 'Invalid deal type specified',

  // Percentage discount errors
  INVALID_PERCENTAGE:
    'Percentage discount must be between 0 and 100',
  MISSING_PERCENTAGE:
    'percentageOff is required for PERCENTAGE_DISCOUNT deal type',
  PERCENTAGE_OUT_OF_RANGE:
    'percentageOff must be greater than 0 and less than or equal to 100',

  // Fixed discount errors
  INVALID_FIXED_AMOUNT: 'Fixed discount amount must be greater than 0',
  MISSING_FIXED_AMOUNT:
    'fixedAmountOff is required for FIXED_DISCOUNT deal type',
  FIXED_AMOUNT_NEGATIVE:
    'fixedAmountOff must be greater than 0',

  // BOGO errors
  INVALID_BOGO_CONFIG:
    'BOGO deal requires buyQuantity and getQuantity greater than 0',
  MISSING_BUY_QUANTITY: 'buyQuantity is required for BOGO deal type',
  MISSING_GET_QUANTITY: 'getQuantity is required for BOGO deal type',
  BUY_QUANTITY_INVALID: 'buyQuantity must be greater than 0',
  GET_QUANTITY_INVALID: 'getQuantity must be greater than 0',
  BOGO_INSUFFICIENT_PRODUCTS:
    'BOGO deal requires at least one product for "buy" and one for "get"',

  // Bundle errors
  INVALID_BUNDLE_PRICE: 'Bundle price must be greater than 0',
  MISSING_BUNDLE_PRICE: 'bundlePrice is required for BUNDLE deal type',
  BUNDLE_PRICE_NEGATIVE: 'bundlePrice must be greater than 0',
  BUNDLE_MIN_PRODUCTS:
    'Bundle deals require at least 2 products',
  BUNDLE_INSUFFICIENT_PRODUCTS:
    'Bundle deal must include at least 2 products',

  // Quantity discount errors
  INVALID_QUANTITY_DISCOUNT:
    'Quantity discount requires minQuantity > 1 and valid discount percentage',
  MISSING_MIN_QUANTITY:
    'minQuantity is required for QUANTITY_DISCOUNT deal type',
  MISSING_QUANTITY_DISCOUNT:
    'quantityDiscount is required for QUANTITY_DISCOUNT deal type',
  MIN_QUANTITY_TOO_LOW:
    'minQuantity must be greater than 1 for quantity-based discounts',
  QUANTITY_DISCOUNT_OUT_OF_RANGE:
    'quantityDiscount must be greater than 0 and less than or equal to 100',

  // Voucher errors
  INVALID_VOUCHER_VALUE: 'Voucher value must be greater than 0',
  MISSING_VOUCHER_VALUE: 'voucherValue is required for VOUCHER deal type',
  VOUCHER_VALUE_NEGATIVE: 'voucherValue must be greater than 0',

  // Tier limit errors
  TIER_LIMIT_PROMOTIONS:
    'BASIC tier allows a maximum of 5 promotions. Upgrade to PRO for unlimited promotions.',
  TIER_LIMIT_PRODUCTS_PER_PROMOTION:
    'BASIC tier allows a maximum of 10 products per promotion. Upgrade to PRO for unlimited products per promotion.',

  // Price validation errors
  QUESTIONABLE_PRICING_DETECTED:
    'Questionable pricing detected. Admin notification sent for review.',
} as const;

/**
 * Type for promotion error message keys
 */
export type PromotionErrorKey = keyof typeof PROMOTION_ERRORS;

/**
 * Get error message by key
 * 
 * @param key - The error message key
 * @returns The error message string
 */
export function getPromotionError(key: PromotionErrorKey): string {
  return PROMOTION_ERRORS[key];
}

