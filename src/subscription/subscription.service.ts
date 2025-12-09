import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { SubscriptionTier, UserRole } from 'generated/prisma';
import { PrismaService } from 'src/prisma/prisma.service';

/**
 * Subscription Service
 * 
 * Manages fixed subscription tiers (BASIC and PRO) for users.
 * BASIC tier is assigned automatically on user registration.
 * 
 * Features:
 * - Upgrade/downgrade between BASIC and PRO tiers
 * - Get current user tier
 * - Analytics for admin dashboard
 * 
 * Business Rules:
 * - All users start with BASIC tier
 * - PRO tier costs 100 PHP per month
 * - BASIC consumers: 1km radius limit
 * - PRO consumers: 3km radius limit
 * - BASIC retailers: 10 products, 5 promotions, 10 products per promotion
 * - PRO retailers: unlimited products, promotions, and products per promotion
 */
@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Upgrades a user to PRO tier.
   * 
   * @param userId - The user ID to upgrade
   * @returns Promise resolving to the updated user (without password)
   * @throws {BadRequestException} If user not found or already on PRO tier
   * 
   * @example
   * ```typescript
   * const user = await subscriptionService.upgradeToPro(1);
   * // User tier is now PRO
   * ```
   */
  async upgradeToPro(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      this.logger.warn(`Upgrade failed: User not found - User ID: ${userId}`);
      throw new BadRequestException('User not found');
    }

    if (user.subscriptionTier === SubscriptionTier.PRO) {
      this.logger.warn(`Upgrade failed: User already on PRO tier - User ID: ${userId}`);
      throw new BadRequestException('User already has PRO tier');
    }

    this.logger.log(`User upgrading to PRO - User ID: ${userId}, Role: ${user.role}`);
    
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { subscriptionTier: SubscriptionTier.PRO },
    });

    const { password: _, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }

  /**
   * Downgrades a user to BASIC tier.
   * 
   * @param userId - The user ID to downgrade
   * @returns Promise resolving to the updated user (without password)
   * @throws {BadRequestException} If user not found or already on BASIC tier
   * 
   * @example
   * ```typescript
   * const user = await subscriptionService.downgradeToBasic(1);
   * // User tier is now BASIC
   * ```
   */
  async downgradeToBasic(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      this.logger.warn(`Downgrade failed: User not found - User ID: ${userId}`);
      throw new BadRequestException('User not found');
    }

    if (user.subscriptionTier === SubscriptionTier.BASIC) {
      this.logger.warn(`Downgrade failed: User already on BASIC tier - User ID: ${userId}`);
      throw new BadRequestException('User already has BASIC tier');
    }

    this.logger.log(`User downgrading to BASIC - User ID: ${userId}, Role: ${user.role}`);
    
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { subscriptionTier: SubscriptionTier.BASIC },
    });

    const { password: _, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }

  /**
   * Gets the current subscription tier for a user.
   * 
   * @param userId - The user ID to get tier for
   * @returns Promise resolving to an object with tier and role
   * @throws {BadRequestException} If user not found
   * 
   * @example
   * ```typescript
   * const tierInfo = await subscriptionService.getCurrentTier(1);
   * // Returns: { tier: 'BASIC', role: 'CONSUMER' }
   * ```
   */
  async getCurrentTier(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        subscriptionTier: true,
        role: true,
        email: true,
        name: true,
      },
    });

    if (!user) {
      this.logger.warn(`Get tier failed: User not found - User ID: ${userId}`);
      throw new BadRequestException('User not found');
    }

    return {
      userId: user.id,
      email: user.email,
      name: user.name,
      tier: user.subscriptionTier,
      role: user.role,
    };
  }

  /**
   * Gets comprehensive subscription analytics for admin dashboard.
   * 
   * Calculates:
   * - Total users by tier (BASIC, PRO)
   * - Users by tier and role (CONSUMER-BASIC, CONSUMER-PRO, RETAILER-BASIC, RETAILER-PRO)
   * - Potential revenue (PRO users × 100 PHP)
   * 
   * @returns Promise resolving to subscription analytics data
   * 
   * @example
   * ```typescript
   * const analytics = await subscriptionService.getAnalytics();
   * // Returns detailed tier distribution and revenue
   * ```
   */
  async getAnalytics() {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        role: true,
        subscriptionTier: true,
      },
    });

    const totalUsers = users.length;
    const basicUsers = users.filter((u) => u.subscriptionTier === SubscriptionTier.BASIC).length;
    const proUsers = users.filter((u) => u.subscriptionTier === SubscriptionTier.PRO).length;

    const consumerBasic = users.filter(
      (u) => u.role === UserRole.CONSUMER && u.subscriptionTier === SubscriptionTier.BASIC,
    ).length;
    const consumerPro = users.filter(
      (u) => u.role === UserRole.CONSUMER && u.subscriptionTier === SubscriptionTier.PRO,
    ).length;
    const retailerBasic = users.filter(
      (u) => u.role === UserRole.RETAILER && u.subscriptionTier === SubscriptionTier.BASIC,
    ).length;
    const retailerPro = users.filter(
      (u) => u.role === UserRole.RETAILER && u.subscriptionTier === SubscriptionTier.PRO,
    ).length;
    const adminBasic = users.filter(
      (u) => u.role === UserRole.ADMIN && u.subscriptionTier === SubscriptionTier.BASIC,
    ).length;
    const adminPro = users.filter(
      (u) => u.role === UserRole.ADMIN && u.subscriptionTier === SubscriptionTier.PRO,
    ).length;

    // PRO tier costs 100 PHP per month
    const monthlyRevenue = proUsers * 100;

    return {
      totalUsers,
      basicUsers,
      proUsers,
      byRoleAndTier: {
        consumer: {
          basic: consumerBasic,
          pro: consumerPro,
          total: consumerBasic + consumerPro,
        },
        retailer: {
          basic: retailerBasic,
          pro: retailerPro,
          total: retailerBasic + retailerPro,
        },
        admin: {
          basic: adminBasic,
          pro: adminPro,
          total: adminBasic + adminPro,
        },
      },
      revenue: {
        monthly: monthlyRevenue,
        yearly: monthlyRevenue * 12,
        currency: 'PHP',
      },
    };
  }
}
