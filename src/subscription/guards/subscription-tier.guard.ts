import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from 'src/prisma/prisma.service';
import { TIER_LIMIT_KEY, TierLimitType } from '../decorators/tier-limit.decorator';
import { SubscriptionTier, UserRole } from 'generated/prisma';

/**
 * Subscription Tier Guard
 * 
 * Enforces subscription tier limits on routes.
 * Works in conjunction with the @TierLimit decorator to check:
 * - Consumer radius limits for nearby searches
 * - Retailer product count limits
 * - Retailer promotion count limits
 * - Retailer products per promotion limits
 * 
 * Limits:
 * - BASIC Consumers: 1km radius
 * - PRO Consumers: 3km radius
 * - BASIC Retailers: 10 products, 5 promotions, 10 products per promotion
 * - PRO Retailers: Unlimited
 * 
 * Usage:
 * ```typescript
 * @Get('nearby')
 * @UseGuards(JwtAuthGuard, SubscriptionTierGuard)
 * @TierLimit(TierLimitType.CONSUMER_RADIUS)
 * findNearby(@Query('radius') radius: string) {
 *   // Guard will check radius against user's tier limit
 * }
 * ```
 */
@Injectable()
export class SubscriptionTierGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const limitType = this.reflector.getAllAndOverride<TierLimitType>(
      TIER_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no tier limit is specified, allow access
    if (!limitType) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.sub) {
      throw new ForbiddenException('User not authenticated');
    }

    // Get user with subscription tier
    const userWithTier = await this.prisma.user.findUnique({
      where: { id: user.sub },
      select: {
        id: true,
        subscriptionTier: true,
        role: true,
      },
    });

    if (!userWithTier) {
      throw new ForbiddenException('User not found');
    }

    // Check limit based on type
    switch (limitType) {
      case TierLimitType.CONSUMER_RADIUS:
        return this.checkConsumerRadiusLimit(
          userWithTier.role,
          userWithTier.subscriptionTier,
          request,
        );

      case TierLimitType.RETAILER_PRODUCT_COUNT:
        return this.checkRetailerProductLimit(
          userWithTier.id,
          userWithTier.role,
          userWithTier.subscriptionTier,
          request,
        );

      case TierLimitType.RETAILER_PROMOTION_COUNT:
        return this.checkRetailerPromotionLimit(
          userWithTier.id,
          userWithTier.role,
          userWithTier.subscriptionTier,
          request,
        );

      case TierLimitType.RETAILER_PRODUCTS_PER_PROMOTION:
        return this.checkProductsPerPromotionLimit(
          userWithTier.role,
          userWithTier.subscriptionTier,
          request,
        );

      default:
        return true;
    }
  }

  /**
   * Checks consumer radius limit for nearby store searches.
   * Only applies to consumers.
   * 
   * @param role - User role
   * @param tier - Subscription tier
   * @param request - HTTP request
   * @throws {BadRequestException} If radius exceeds tier limit
   */
  private checkConsumerRadiusLimit(
    role: UserRole,
    tier: SubscriptionTier,
    request: Request & { query?: { radius?: string } },
  ): boolean {
    // Only apply to consumers
    if (role !== UserRole.CONSUMER) {
      return true;
    }

    const radiusParam = request.query?.radius;
    if (!radiusParam) {
      return true;
    }

    const radius = parseFloat(radiusParam);
    if (isNaN(radius)) {
      throw new BadRequestException('Invalid radius parameter');
    }

    const maxRadius = tier === SubscriptionTier.PRO ? 3 : 1;

    if (radius > maxRadius) {
      throw new ForbiddenException(
        `Your ${tier} tier allows a maximum radius of ${maxRadius}km. Upgrade to PRO for extended radius.`,
      );
    }

    return true;
  }

  /**
   * Checks retailer product count limit before creation.
   * Only applies to retailers.
   * 
   * @param userId - User ID
   * @param role - User role
   * @param tier - Subscription tier
   * @param request - HTTP request
   * @throws {ForbiddenException} If product limit exceeded
   */
  private async checkRetailerProductLimit(
    userId: number,
    role: UserRole,
    tier: SubscriptionTier,
    request: Request & { body?: { storeId?: number } },
  ): Promise<boolean> {
    // Only apply to retailers
    if (role !== UserRole.RETAILER) {
      return true;
    }

    // PRO tier has no limits
    if (tier === SubscriptionTier.PRO) {
      return true;
    }

    // BASIC tier: max 10 products
    const storeId = request.body?.storeId;
    if (!storeId) {
      return true;
    }

    // Get store to verify ownership
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: { ownerId: true },
    });

    if (!store || store.ownerId !== userId) {
      return true; // Let the controller handle ownership validation
    }

    // Count existing products for this store
    const productCount = await this.prisma.product.count({
      where: { storeId },
    });

    if (productCount >= 10) {
      throw new ForbiddenException(
        'BASIC tier allows a maximum of 10 products. Upgrade to PRO for unlimited products.',
      );
    }

    return true;
  }

  /**
   * Checks retailer promotion count limit before creation.
   * Only applies to retailers.
   * 
   * @param userId - User ID
   * @param role - User role
   * @param tier - Subscription tier
   * @param request - HTTP request
   * @throws {ForbiddenException} If promotion limit exceeded
   */
  private async checkRetailerPromotionLimit(
    userId: number,
    role: UserRole,
    tier: SubscriptionTier,
    request: Request & { body?: { productIds?: number[] } },
  ): Promise<boolean> {
    // Only apply to retailers
    if (role !== UserRole.RETAILER) {
      return true;
    }

    // PRO tier has no limits
    if (tier === SubscriptionTier.PRO) {
      return true;
    }

    // BASIC tier: max 5 promotions
    // Count promotions owned by this retailer (through their stores' products)
    const stores = await this.prisma.store.findMany({
      where: { ownerId: userId },
      select: { id: true },
    });

    const storeIds = stores.map((s) => s.id);

    // Count existing promotions for products in this retailer's stores
    const promotionCount = await this.prisma.promotion.count({
      where: {
        promotionProducts: {
          some: {
            product: {
              storeId: {
                in: storeIds,
              },
            },
          },
        },
      },
    });

    if (promotionCount >= 5) {
      throw new ForbiddenException(
        'BASIC tier allows a maximum of 5 promotions. Upgrade to PRO for unlimited promotions.',
      );
    }

    return true;
  }

  /**
   * Checks products per promotion limit.
   * Only applies to retailers.
   * 
   * @param role - User role
   * @param tier - Subscription tier
   * @param request - HTTP request
   * @throws {ForbiddenException} If products per promotion limit exceeded
   */
  private checkProductsPerPromotionLimit(
    role: UserRole,
    tier: SubscriptionTier,
    request: Request & { body?: { productIds?: number[] } },
  ): boolean {
    // Only apply to retailers
    if (role !== UserRole.RETAILER) {
      return true;
    }

    // PRO tier has no limits
    if (tier === SubscriptionTier.PRO) {
      return true;
    }

    // BASIC tier: max 10 products per promotion
    const productIds = request.body?.productIds;
    if (!productIds || !Array.isArray(productIds)) {
      return true;
    }

    if (productIds.length > 10) {
      throw new ForbiddenException(
        'BASIC tier allows a maximum of 10 products per promotion. Upgrade to PRO for unlimited products per promotion.',
      );
    }

    return true;
  }
}

