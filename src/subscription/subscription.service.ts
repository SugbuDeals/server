import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, Subscription, SubscriptionStatus } from 'generated/prisma';
import { PrismaService } from 'src/prisma/prisma.service';

/**
 * Service responsible for handling subscription-related operations.
 * Provides methods to query and manage subscription data from the database.
 */
@Injectable()
export class SubscriptionService {
  constructor(private prisma: PrismaService) {}

  /**
   * Retrieves a single subscription by its unique identifier.
   * @param params.where - Unique identifier criteria to find the subscription
   * @returns Promise resolving to the found subscription or null if not found
   */
  async subscription(params: {
    where: Prisma.SubscriptionWhereUniqueInput;
    include?: Prisma.SubscriptionInclude;
  }): Promise<Subscription | null> {
    const { where, include } = params;
    return this.prisma.subscription.findUnique({ where, include });
  }

  /**
   * Retrieves multiple subscriptions based on provided criteria.
   * @param params - Query parameters for finding subscriptions
   * @param params.skip - Number of records to skip
   * @param params.take - Number of records to take
   * @param params.cursor - Cursor for pagination
   * @param params.where - Filter conditions
   * @param params.orderBy - Sorting criteria
   * @param params.include - Relations to include
   * @returns Promise resolving to an array of subscriptions
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
   * Gets the active subscription for a user.
   * @param userId - The user ID to get the active subscription for
   * @returns Promise resolving to the active subscription or null if not found
   */
  async getActiveSubscription(userId: number): Promise<Subscription | null> {
    return this.prisma.subscription.findFirst({
      where: {
        userId,
        status: SubscriptionStatus.ACTIVE,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Creates a new subscription in the database.
   * @param params.data - The data for creating the subscription
   * @returns Promise resolving to the newly created subscription
   */
  async create(params: {
    data: Prisma.SubscriptionCreateInput;
  }): Promise<Subscription> {
    const { data } = params;
    return this.prisma.subscription.create({ data });
  }

  /**
   * Updates an existing subscription in the database.
   * @param params.where - Unique identifier of the subscription to update
   * @param params.data - The data to update the subscription with
   * @returns Promise resolving to the updated subscription
   * @throws {PrismaClientKnownRequestError} If the subscription is not found
   */
  async update(params: {
    where: Prisma.SubscriptionWhereUniqueInput;
    data: Prisma.SubscriptionUpdateInput;
    include?: Prisma.SubscriptionInclude;
  }): Promise<Subscription> {
    const { where, data, include } = params;
    return this.prisma.subscription.update({ where, data, include });
  }

  /**
   * Deletes a subscription from the database.
   * @param params.where - Unique identifier of the subscription to delete
   * @returns Promise resolving to the deleted subscription
   * @throws {PrismaClientKnownRequestError} If the subscription is not found
   */
  async delete(params: {
    where: Prisma.SubscriptionWhereUniqueInput;
  }): Promise<Subscription> {
    const { where } = params;
    return this.prisma.subscription.delete({ where });
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
  ): Promise<Subscription> {
    // Find the subscription template to copy from
    const templateSubscription = await this.subscription({
      where: { id: subscriptionId },
    });

    if (!templateSubscription) {
      throw new BadRequestException('Subscription not found');
    }

    // Cancel any existing active subscription
    const activeSubscription = await this.getActiveSubscription(userId);
    if (activeSubscription) {
      await this.update({
        where: { id: activeSubscription.id },
        data: {
          status: SubscriptionStatus.CANCELLED,
          cancelledAt: new Date(),
        },
      });
    }

    // Create new subscription based on template with ACTIVE status
    return this.prisma.subscription.create({
      data: {
        plan: templateSubscription.plan,
        billingCycle: templateSubscription.billingCycle,
        price: templateSubscription.price,
        status: SubscriptionStatus.ACTIVE,
        startsAt: new Date(),
        endsAt: templateSubscription.endsAt,
        user: {
          connect: {
            id: userId,
          },
        },
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
  ): Promise<Subscription> {
    // Find the subscription template to copy from
    const templateSubscription = await this.subscription({
      where: { id: subscriptionId },
    });

    if (!templateSubscription) {
      throw new BadRequestException('Subscription not found');
    }

    // Cancel current active subscription
    const activeSubscription = await this.getActiveSubscription(userId);

    if (!activeSubscription) {
      throw new BadRequestException('No active subscription found');
    }

    await this.update({
      where: { id: activeSubscription.id },
      data: {
        status: SubscriptionStatus.CANCELLED,
        cancelledAt: new Date(),
      },
    });

    // Create new subscription based on template with ACTIVE status
    return this.prisma.subscription.create({
      data: {
        plan: templateSubscription.plan,
        billingCycle: templateSubscription.billingCycle,
        price: templateSubscription.price,
        status: SubscriptionStatus.ACTIVE,
        startsAt: new Date(),
        endsAt: templateSubscription.endsAt,
        user: {
          connect: {
            id: userId,
          },
        },
      },
    });
  }

  /**
   * Cancels the retailer's active subscription.
   * @param userId - The user ID whose subscription to cancel
   * @returns Promise resolving to the cancelled subscription
   * @throws {BadRequestException} If no active subscription exists
   */
  async cancelRetailerSubscription(userId: number): Promise<Subscription> {
    const activeSubscription = await this.getActiveSubscription(userId);

    if (!activeSubscription) {
      throw new BadRequestException('No active subscription found');
    }

    return this.update({
      where: { id: activeSubscription.id },
      data: {
        status: SubscriptionStatus.CANCELLED,
        cancelledAt: new Date(),
      },
    });
  }
}

