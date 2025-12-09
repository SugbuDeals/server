import { SetMetadata } from '@nestjs/common';

/**
 * Tier Limit Type
 * 
 * Defines the types of limits that can be enforced by the subscription tier guard.
 */
export enum TierLimitType {
  /** Consumer radius limit for nearby store searches (1km BASIC, 3km PRO) */
  CONSUMER_RADIUS = 'CONSUMER_RADIUS',
  /** Retailer product count limit (10 BASIC, unlimited PRO) */
  RETAILER_PRODUCT_COUNT = 'RETAILER_PRODUCT_COUNT',
  /** Retailer promotion count limit (5 BASIC, unlimited PRO) */
  RETAILER_PROMOTION_COUNT = 'RETAILER_PROMOTION_COUNT',
  /** Retailer products per promotion limit (10 BASIC, unlimited PRO) */
  RETAILER_PRODUCTS_PER_PROMOTION = 'RETAILER_PRODUCTS_PER_PROMOTION',
}

export const TIER_LIMIT_KEY = 'tierLimit';

/**
 * Tier Limit Decorator
 * 
 * Marks a route to be checked for subscription tier limits.
 * Use with the SubscriptionTierGuard to enforce tier-based restrictions.
 * 
 * @param limitType - The type of limit to enforce
 * 
 * @example
 * ```typescript
 * @Get('nearby')
 * @TierLimit(TierLimitType.CONSUMER_RADIUS)
 * findNearby() {
 *   // This route will check consumer radius limits
 * }
 * ```
 */
export const TierLimit = (limitType: TierLimitType) =>
  SetMetadata(TIER_LIMIT_KEY, limitType);

