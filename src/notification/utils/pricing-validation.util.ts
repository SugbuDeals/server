/**
 * Pricing Validation Utility
 * 
 * Provides utility functions to determine if product prices or promotion discounts
 * are questionable and require admin review. These validations help maintain data
 * quality and prevent suspicious pricing entries.
 */

/**
 * Checks if a product price is questionable and requires admin review.
 * 
 * A price is considered questionable if:
 * - Price is extremely low (less than 0.01) - likely a data entry error
 * - Price is extremely high (greater than 1,000,000) - likely a data entry error
 * 
 * @param price - The product price to validate (in currency units)
 * @returns true if the price is questionable and should be flagged for admin review
 * 
 * @example
 * ```typescript
 * if (isQuestionableProductPrice(product.price)) {
 *   // Notify admin for review
 * }
 * ```
 */
export function isQuestionableProductPrice(price: number): boolean {
  // Price is questionable if it's extremely low or extremely high
  return price < 0.01 || price > 1000000;
}

/**
 * Checks if a promotion discount is questionable and requires admin review.
 * 
 * A discount is considered questionable if:
 * - Discount is more than 90% (suspiciously high - too good to be true)
 * - Discount is negative (price increase, not a discount)
 * - Calculated discount doesn't match stated discount (within 5% tolerance)
 * - Discounted price is suspiciously low (less than 0.01)
 * 
 * @param discount - The discount percentage to validate (0-100)
 * @param originalPrice - The original product price (optional, for validation)
 * @param discountedPrice - The discounted price (optional, for validation)
 * @returns true if the discount is questionable and should be flagged for admin review
 * 
 * @example
 * ```typescript
 * const discountedPrice = originalPrice * (1 - discount / 100);
 * if (isQuestionablePromotionDiscount(discount, originalPrice, discountedPrice)) {
 *   // Notify admin for review
 * }
 * ```
 */
export function isQuestionablePromotionDiscount(
  discount: number,
  originalPrice?: number,
  discountedPrice?: number,
): boolean {
  // Discount is questionable if:
  // 1. More than 90% off (too good to be true)
  // 2. Negative discount (price increase)
  if (discount > 90 || discount < 0) {
    return true;
  }

  // If we have both original and discounted prices, validate
  if (originalPrice !== undefined && discountedPrice !== undefined) {
    const calculatedDiscount =
      ((originalPrice - discountedPrice) / originalPrice) * 100;
    
    // If calculated discount doesn't match the stated discount within 5% tolerance
    if (Math.abs(calculatedDiscount - discount) > 5) {
      return true;
    }

    // If discounted price is suspiciously low
    if (discountedPrice < 0.01) {
      return true;
    }
  }

  return false;
}

