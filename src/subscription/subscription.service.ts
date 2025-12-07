import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import {
  Prisma,
  Subscription,
  UserSubscription,
  SubscriptionStatus,
  SubscriptionPlan,
  BillingCycle,
} from 'generated/prisma';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotificationService } from 'src/notification/notification.service';
import {
  SubscriptionAnalyticsDTO,
  SubscriptionCountByPlan,
  SubscriptionCountByStatus,
  SubscriptionCountByBillingCycle,
} from './dto/subscription-analytics.dto';

/**
 * Subscription Service
 * 
 * Provides subscription plan and user subscription management operations.
 * Handles CRUD operations for subscription plans (admin-defined templates)
 * and user subscriptions (retailer subscriptions to plans).
 * 
 * Features:
 * - Subscription plan management (admin-only)
 * - Retailer subscription joining, updating, and cancellation
 * - Automatic cancellation of existing subscriptions when joining new ones
 * - Subscription analytics for admin dashboard
 * - Notification triggers for new subscription availability
 * 
 * Business Rules:
 * - Retailers can only have one active subscription at a time
 * - Joining a new subscription automatically cancels the current one
 * - Subscription plans are templates that retailers subscribe to
 */
@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  /**
   * Retrieves an admin-defined subscription plan by its unique identifier.
   * 
   * @param params - Query parameters
   * @param params.where - Unique identifier criteria (id)
   * @param params.include - Related data to include
   * @returns Promise resolving to the found subscription plan or null if not found
   */
  async subscription(params: {
    where: Prisma.SubscriptionWhereUniqueInput;
    include?: Prisma.SubscriptionInclude;
  }): Promise<Subscription | null> {
    const { where, include } = params;
    return this.prisma.subscription.findUnique({ where, include });
  }

  /**
   * Retrieves multiple subscription plans.
   * 
   * Supports pagination, filtering, sorting, and including related data.
   * 
   * @param params - Query parameters for finding subscription plans
   * @param params.skip - Number of records to skip for pagination
   * @param params.take - Number of records to return
   * @param params.cursor - Cursor for cursor-based pagination
   * @param params.where - Filter conditions
   * @param params.orderBy - Sorting criteria
   * @param params.include - Related data to include
   * @returns Promise resolving to an array of subscription plans
   */
  async subscriptions(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.SubscriptionWhereUniqueInput;
    where?: Prisma.SubscriptionWhereInput;
    orderBy?: Prisma.SubscriptionOrderByWithRelationInput;
    include?: Prisma.SubscriptionInclude;
  }): Promise<Subscription[]> {
    const { skip, take, cursor, where, orderBy, include } = params;
    return this.prisma.subscription.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
      include,
    });
  }

  /**
   * Creates a new subscription plan (admin-defined template).
   * 
   * After creation, if the plan is active, all retailers are notified
   * about the new subscription availability.
   * 
   * @param params - Create parameters
   * @param params.data - The data for creating the subscription plan
   * @returns Promise resolving to the newly created subscription plan
   * @throws {PrismaClientKnownRequestError} If subscription creation fails
   */
  async createPlan(params: {
    data: Prisma.SubscriptionCreateInput;
  }): Promise<Subscription> {
    const { data } = params;
    const subscription = await this.prisma.subscription.create({ data });

    this.logger.log(`Subscription plan created - Plan ID: ${subscription.id}, Name: ${subscription.name}, Plan: ${subscription.plan}, Active: ${subscription.isActive}`);

    // Notify all retailers about the new subscription
    if (subscription.isActive) {
      this.notificationService
        .notifyNewSubscriptionAvailable(subscription.id)
        .catch((err: unknown) => {
          this.logger.error(`Error creating subscription availability notification for plan ${subscription.id}:`, err);
        });
    }

    return subscription;
  }

  /**
   * Updates an existing subscription plan.
   * 
   * @param params - Update parameters
   * @param params.where - Unique identifier of the subscription plan to update
   * @param params.data - The data to update the subscription plan with
   * @param params.include - Related data to include in response
   * @returns Promise resolving to the updated subscription plan
   * @throws {PrismaClientKnownRequestError} If the subscription plan is not found
   */
  async updatePlan(params: {
    where: Prisma.SubscriptionWhereUniqueInput;
    data: Prisma.SubscriptionUpdateInput;
    include?: Prisma.SubscriptionInclude;
  }): Promise<Subscription> {
    const { where, data, include } = params;
    return this.prisma.subscription.update({ where, data, include });
  }

  /**
   * Deletes a subscription plan.
   * 
   * Note: This does not delete user subscriptions that reference this plan.
   * User subscriptions maintain a reference to the plan even after deletion.
   * 
   * @param params - Delete parameters
   * @param params.where - Unique identifier of the subscription plan to delete
   * @returns Promise resolving to the deleted subscription plan
   * @throws {PrismaClientKnownRequestError} If the subscription plan is not found
   */
  async deletePlan(params: {
    where: Prisma.SubscriptionWhereUniqueInput;
  }): Promise<Subscription> {
    const { where } = params;
    return this.prisma.subscription.delete({ where });
  }

  /**
   * Retrieves a single user subscription record.
   */
  async userSubscription(params: {
    where: Prisma.UserSubscriptionWhereUniqueInput;
    include?: Prisma.UserSubscriptionInclude;
  }): Promise<UserSubscription | null> {
    const { where, include } = params;
    return this.prisma.userSubscription.findUnique({ where, include });
  }

  /**
   * Retrieves user subscription records.
   */
  async userSubscriptions(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.UserSubscriptionWhereUniqueInput;
    where?: Prisma.UserSubscriptionWhereInput;
    orderBy?: Prisma.UserSubscriptionOrderByWithRelationInput;
    include?: Prisma.UserSubscriptionInclude;
  }): Promise<UserSubscription[]> {
    const { skip, take, cursor, where, orderBy, include } = params;
    return this.prisma.userSubscription.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
      include,
    });
  }

  /**
   * Gets the active user subscription for a retailer.
   * 
   * Returns the most recently created active subscription for the user.
   * Retailers can only have one active subscription at a time.
   * 
   * @param userId - The user ID to get the active subscription for
   * @returns Promise resolving to the active user subscription (with plan details) or null if none exists
   */
  async getActiveUserSubscription(
    userId: number,
  ): Promise<UserSubscription | null> {
    return this.prisma.userSubscription.findFirst({
      where: {
        userId,
        status: SubscriptionStatus.ACTIVE,
      },
      include: {
        subscription: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Joins a subscription for a retailer. Cancels any existing active subscription first.
   * Ensures only one active subscription per user.
   * @param userId - The user ID joining the subscription
   * @param subscriptionId - The subscription ID to join (template subscription)
   * @returns Promise resolving to the newly created subscription
   * @throws {BadRequestException} If subscription not found
   */
  async joinSubscription(
    userId: number,
    subscriptionId: number,
  ): Promise<UserSubscription> {
    const templateSubscription = await this.subscription({
      where: { id: subscriptionId },
    });

    if (!templateSubscription || !templateSubscription.isActive) {
      this.logger.warn(`Subscription join failed: Subscription not available - User ID: ${userId}, Subscription ID: ${subscriptionId}`);
      throw new BadRequestException('Subscription not available');
    }

    // Ensure retailers only have a single active subscription
    const activeSubscription = await this.getActiveUserSubscription(userId);
    if (activeSubscription) {
      this.logger.log(`Cancelling existing subscription - User ID: ${userId}, Old Subscription ID: ${activeSubscription.id}`);
      await this.prisma.userSubscription.update({
        where: { id: activeSubscription.id },
        data: {
          status: SubscriptionStatus.CANCELLED,
          cancelledAt: new Date(),
        },
      });
    }

    this.logger.log(`User joining subscription - User ID: ${userId}, Subscription ID: ${subscriptionId}, Plan: ${templateSubscription.plan}`);
    return this.prisma.userSubscription.create({
      data: {
        price: templateSubscription.price,
        billingCycle: templateSubscription.billingCycle,
        status: SubscriptionStatus.ACTIVE,
        startsAt: new Date(),
        endsAt: templateSubscription.endsAt,
        user: {
          connect: { id: userId },
        },
        subscription: {
          connect: { id: subscriptionId },
        },
      },
      include: {
        subscription: true,
      },
    });
  }

  /**
   * Updates the retailer's active subscription to a different subscription plan.
   * @param userId - The user ID whose subscription to update
   * @param subscriptionId - The subscription ID to update to (template subscription)
   * @returns Promise resolving to the newly created subscription
   * @throws {BadRequestException} If no active subscription exists or template not found
   */
  async updateRetailerSubscription(
    userId: number,
    subscriptionId: number,
  ): Promise<UserSubscription> {
    const templateSubscription = await this.subscription({
      where: { id: subscriptionId },
    });

    if (!templateSubscription || !templateSubscription.isActive) {
      throw new BadRequestException('Subscription not available');
    }

    const activeSubscription = await this.getActiveUserSubscription(userId);

    if (!activeSubscription) {
      throw new BadRequestException('No active subscription found');
    }

    // Cancel current subscription history and create a new record
    await this.prisma.userSubscription.update({
      where: { id: activeSubscription.id },
      data: {
        status: SubscriptionStatus.CANCELLED,
        cancelledAt: new Date(),
      },
    });

    return this.prisma.userSubscription.create({
      data: {
        price: templateSubscription.price,
        billingCycle: templateSubscription.billingCycle,
        status: SubscriptionStatus.ACTIVE,
        startsAt: new Date(),
        endsAt: templateSubscription.endsAt,
        user: {
          connect: { id: userId },
        },
        subscription: {
          connect: { id: subscriptionId },
        },
      },
      include: {
        subscription: true,
      },
    });
  }

  /**
   * Cancels the retailer's active subscription.
   * @param userId - The user ID whose subscription to cancel
   * @returns Promise resolving to the cancelled subscription
   * @throws {BadRequestException} If no active subscription exists
   */
  async cancelRetailerSubscription(userId: number): Promise<UserSubscription> {
    const activeSubscription = await this.getActiveUserSubscription(userId);

    if (!activeSubscription) {
      this.logger.warn(`Subscription cancellation failed: No active subscription - User ID: ${userId}`);
      throw new BadRequestException('No active subscription found');
    }

    this.logger.log(`User cancelling subscription - User ID: ${userId}, Subscription ID: ${activeSubscription.id}`);
    return this.prisma.userSubscription.update({
      where: { id: activeSubscription.id },
      data: {
        status: SubscriptionStatus.CANCELLED,
        cancelledAt: new Date(),
      },
      include: {
        subscription: true,
      },
    });
  }

  /**
   * Gets comprehensive subscription analytics for admin dashboard.
   * 
   * Calculates:
   * - Total subscriptions and counts by status (active, cancelled, expired, pending)
   * - Counts by plan type (FREE, BASIC, PREMIUM)
   * - Counts by billing cycle (MONTHLY, YEARLY)
   * - Total revenue from active subscriptions
   * - Average subscription price
   * - Recent subscriptions (last 30 days)
   * - Subscriptions created this month
   * 
   * @returns Promise resolving to subscription analytics data
   */
  async getAnalytics(): Promise<SubscriptionAnalyticsDTO> {
    const userSubscriptions = await this.prisma.userSubscription.findMany({
      include: {
        subscription: true,
      },
    });

    const total = userSubscriptions.length;
    const active = userSubscriptions.filter(
      (s) => s.status === SubscriptionStatus.ACTIVE,
    ).length;
    const cancelled = userSubscriptions.filter(
      (s) => s.status === SubscriptionStatus.CANCELLED,
    ).length;
    const expired = userSubscriptions.filter(
      (s) => s.status === SubscriptionStatus.EXPIRED,
    ).length;
    const pending = userSubscriptions.filter(
      (s) => s.status === SubscriptionStatus.PENDING,
    ).length;

    const byPlan: SubscriptionCountByPlan[] = Object.values(
      SubscriptionPlan,
    ).map((plan) => ({
      plan,
      count: userSubscriptions.filter(
        (s) => s.subscription?.plan === plan,
      ).length,
    }));

    const byStatus: SubscriptionCountByStatus[] = Object.values(
      SubscriptionStatus,
    ).map((status) => ({
      status,
      count: userSubscriptions.filter((s) => s.status === status).length,
    }));

    const byBillingCycle: SubscriptionCountByBillingCycle[] = Object.values(
      BillingCycle,
    ).map((billingCycle) => ({
      billingCycle,
      count: userSubscriptions.filter(
        (s) => s.billingCycle === billingCycle,
      ).length,
    }));

    const activeSubscriptions = userSubscriptions.filter(
      (s) => s.status === SubscriptionStatus.ACTIVE,
    );
    const totalRevenue = activeSubscriptions.reduce(
      (sum, sub) => sum + Number(sub.price),
      0,
    );

    const averagePrice =
      userSubscriptions.length > 0
        ? userSubscriptions.reduce(
            (sum, sub) => sum + Number(sub.price),
            0,
          ) / userSubscriptions.length
        : 0;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentSubscriptions = userSubscriptions.filter(
      (s) => s.createdAt >= thirtyDaysAgo,
    ).length;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const subscriptionsThisMonth = userSubscriptions.filter(
      (s) => s.createdAt >= startOfMonth,
    ).length;

    return {
      total,
      active,
      cancelled,
      expired,
      pending,
      byPlan,
      byStatus,
      byBillingCycle,
      totalRevenue: totalRevenue.toFixed(2),
      averagePrice: averagePrice.toFixed(2),
      recentSubscriptions,
      subscriptionsThisMonth,
    };
  }
}

