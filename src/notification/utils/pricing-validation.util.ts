/**
 * Pricing validation utility
 * Determines if a price or discount is questionable and requires admin review
 */

/**
 * Checks if a product price is questionable
 * A price is considered questionable if:
 * - Price is extremely low (less than 0.01)
 * - Price is extremely high (greater than 1,000,000)
 * @param price - The product price to validate
 * @returns true if the price is questionable
 */
export function isQuestionableProductPrice(price: number): boolean {
  // Price is questionable if it's extremely low or extremely high
  return price < 0.01 || price > 1000000;
}

/**
 * Checks if a promotion discount is questionable
 * A discount is considered questionable if:
 * - Discount is more than 90% (suspiciously high)
 * - Discount is negative
 * @param discount - The discount percentage to validate
 * @param originalPrice - The original product price (optional)
 * @param discountedPrice - The discounted price (optional)
 * @returns true if the discount is questionable
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

