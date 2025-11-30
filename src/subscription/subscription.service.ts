import { BadRequestException, Injectable } from '@nestjs/common';
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
 * Service responsible for handling subscription-related operations.
 * Provides methods to query and manage subscription data from the database.
 */
@Injectable()
export class SubscriptionService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  /**
   * Retrieves an admin-defined subscription plan by its unique identifier.
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
   * Creates a new subscription plan.
   */
  async createPlan(params: {
    data: Prisma.SubscriptionCreateInput;
  }): Promise<Subscription> {
    const { data } = params;
    const subscription = await this.prisma.subscription.create({ data });

    // Notify all retailers about the new subscription
    if (subscription.isActive) {
      this.notificationService
        .notifyNewSubscriptionAvailable(subscription.id)
        .catch((err: unknown) => {
          console.error('Error creating subscription availability notification:', err);
        });
    }

    return subscription;
  }

  /**
   * Updates an existing subscription plan.
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
      throw new BadRequestException('Subscription not available');
    }

    // Ensure retailers only have a single active subscription
    const activeSubscription = await this.getActiveUserSubscription(userId);
    if (activeSubscription) {
      await this.prisma.userSubscription.update({
        where: { id: activeSubscription.id },
        data: {
          status: SubscriptionStatus.CANCELLED,
          cancelledAt: new Date(),
        },
      });
    }

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
      throw new BadRequestException('No active subscription found');
    }

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
   * Gets subscription analytics for admin dashboard.
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

