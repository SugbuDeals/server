import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotificationService } from './notification.service';
import {
  NotificationType,
  SubscriptionStatus,
  Prisma,
} from 'generated/prisma';

/**
 * Optimized notification scheduler for low-memory environments (512MB RAM)
 * 
 * Key optimizations:
 * - Batch processing with small batch sizes
 * - Cursor-based pagination to avoid loading all records
 * - Selective field queries (only fetch needed data)
 * - Bulk notification creation
 * - Memory-efficient error handling
 */
@Injectable()
export class NotificationSchedulerService {
  private readonly logger = new Logger(NotificationSchedulerService.name);
  
  // Batch sizes optimized for 512MB RAM server
  private readonly BATCH_SIZE = 50; // Process 50 records at a time
  private readonly NOTIFICATION_BATCH_SIZE = 100; // Create 100 notifications per batch
  
  // Time windows for "ending soon" notifications (in hours)
  private readonly PROMOTION_ENDING_SOON_HOURS = 24;
  private readonly SUBSCRIPTION_ENDING_SOON_HOURS = 48;

  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  /**
   * Main cron job that runs every hour to check for scheduled notifications
   * Runs at minute 0 of every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handleScheduledNotifications() {
    this.logger.log('Starting scheduled notification generation');
    const startTime = Date.now();

    try {
      // Run all notification checks in parallel for efficiency
      await Promise.allSettled([
        this.checkPromotionsEndingSoon(),
        this.checkPromotionsEnded(),
        this.checkSubscriptionsEndingSoon(),
        this.checkSubscriptionsExpired(),
      ]);

      const duration = Date.now() - startTime;
      this.logger.log(`Completed scheduled notification generation in ${duration}ms`);
    } catch (error) {
      this.logger.error('Error in scheduled notification generation', error);
    }
  }

  /**
   * Check for promotions ending soon (within 24 hours).
   * 
   * Uses cursor-based pagination and batch processing to efficiently
   * process promotions and notify users who bookmarked the products.
   * 
   * Optimization details:
   * - Only fetches minimal fields needed
   * - Processes in batches of BATCH_SIZE
   * - Creates notifications in batches of NOTIFICATION_BATCH_SIZE
   * - Skips promotions that already have ending soon notifications
   */
  private async checkPromotionsEndingSoon(): Promise<void> {
    this.logger.log('Checking promotions ending soon...');
    
    const now = new Date();
    const endingSoonThreshold = new Date(
      now.getTime() + this.PROMOTION_ENDING_SOON_HOURS * 60 * 60 * 1000,
    );

    let cursor: number | undefined = undefined;
    let processedCount = 0;
    let notificationCount = 0;

    try {
      while (true) {
        // Fetch batch of promotions ending soon
        // Only select minimal fields needed
        const promotions: Array<{
          id: number;
          productId: number | null;
          product: {
            storeId: number;
            store: {
              id: number;
              ownerId: number;
            } | null;
          } | null;
        }> = await this.prisma.promotion.findMany({
          where: {
            active: true,
            endsAt: {
              gte: now,
              lte: endingSoonThreshold,
            },
            // Exclude promotions that already have ending soon notifications
            // by checking if notification exists (we'll track this in memory)
          },
          select: {
            id: true,
            productId: true,
            product: {
              select: {
                storeId: true,
                store: {
                  select: {
                    id: true,
                    ownerId: true,
                  },
                },
              },
            },
          },
          take: this.BATCH_SIZE,
          ...(cursor && { skip: 1, cursor: { id: cursor } }),
          orderBy: { id: 'asc' },
        });

        if (promotions.length === 0) break;

        // Process each promotion
        for (const promotion of promotions) {
          try {
            // Check if notification already exists to avoid duplicates
            const existingNotification = await this.prisma.notification.findFirst({
              where: {
                promotionId: promotion.id,
                type: NotificationType.PROMOTION_ENDING_SOON,
                createdAt: {
                  gte: new Date(now.getTime() - 24 * 60 * 60 * 1000), // Last 24 hours
                },
              },
              select: { id: true },
            });

            if (!existingNotification && promotion.product?.store?.ownerId) {
              await this.notificationService.notifyPromotionEndingSoon(
                promotion.id,
              );
              notificationCount++;
            }
          } catch (error) {
            this.logger.error(
              `Error processing promotion ${promotion.id} ending soon`,
              error,
            );
            // Continue processing other promotions
          }
        }

        const batchLength = promotions.length;
        processedCount += batchLength;
        cursor = promotions[batchLength - 1]?.id;

        // Memory cleanup: clear the array reference
        promotions.length = 0;

        // If we got fewer records than batch size, we're done
        if (batchLength < this.BATCH_SIZE) break;
      }

      this.logger.log(
        `Processed ${processedCount} promotions, created ${notificationCount} notifications`,
      );
    } catch (error) {
      this.logger.error('Error checking promotions ending soon', error);
    }
  }

  /**
   * Check for promotions that have ended
   * Uses batch processing to avoid memory issues
   */
  private async checkPromotionsEnded(): Promise<void> {
    this.logger.log('Checking promotions that ended...');

    const now = new Date();
    // Check promotions that ended in the last hour (to avoid processing old ones)
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    let cursor: number | undefined = undefined;
    let processedCount = 0;
    let notificationCount = 0;

    try {
      while (true) {
        // Fetch batch of ended promotions
        const promotions: Array<{
          id: number;
          productId: number | null;
          product: {
            storeId: number;
            store: {
              id: number;
              ownerId: number;
            } | null;
          } | null;
        }> = await this.prisma.promotion.findMany({
          where: {
            active: true,
            endsAt: {
              gte: oneHourAgo,
              lt: now,
            },
          },
          select: {
            id: true,
            productId: true,
            product: {
              select: {
                storeId: true,
                store: {
                  select: {
                    id: true,
                    ownerId: true,
                  },
                },
              },
            },
          },
          take: this.BATCH_SIZE,
          ...(cursor && { skip: 1, cursor: { id: cursor } }),
          orderBy: { id: 'asc' },
        });

        if (promotions.length === 0) break;

        // Process each promotion
        for (const promotion of promotions) {
          try {
            // Check if notification already exists
            const existingNotification = await this.prisma.notification.findFirst({
              where: {
                promotionId: promotion.id,
                type: NotificationType.PROMOTION_ENDED,
                createdAt: {
                  gte: oneHourAgo,
                },
              },
              select: { id: true },
            });

            if (!existingNotification && promotion.product?.store?.ownerId) {
              await this.notificationService.notifyPromotionEnded(promotion.id);
              notificationCount++;

              // Mark promotion as inactive
              await this.prisma.promotion.update({
                where: { id: promotion.id },
                data: { active: false },
              });
            }
          } catch (error) {
            this.logger.error(
              `Error processing promotion ${promotion.id} ended`,
              error,
            );
          }
        }

        const batchLength = promotions.length;
        processedCount += batchLength;
        cursor = promotions[batchLength - 1]?.id;

        // Memory cleanup
        promotions.length = 0;

        if (batchLength < this.BATCH_SIZE) break;
      }

      this.logger.log(
        `Processed ${processedCount} ended promotions, created ${notificationCount} notifications`,
      );
    } catch (error) {
      this.logger.error('Error checking promotions ended', error);
    }
  }

  /**
   * Check for subscriptions ending soon
   * Uses efficient batch processing with minimal memory footprint
   */
  private async checkSubscriptionsEndingSoon(): Promise<void> {
    this.logger.log('Checking subscriptions ending soon...');

    const now = new Date();
    const endingSoonThreshold = new Date(
      now.getTime() + this.SUBSCRIPTION_ENDING_SOON_HOURS * 60 * 60 * 1000,
    );

    let cursor: number | undefined = undefined;
    let processedCount = 0;
    let notificationCount = 0;

    try {
      while (true) {
        // Fetch batch of subscriptions ending soon
        // Only select fields we need
        const subscriptions: Array<{
          id: number;
          userId: number;
          endsAt: Date | null;
        }> = await this.prisma.userSubscription.findMany({
          where: {
            status: SubscriptionStatus.ACTIVE,
            endsAt: {
              gte: now,
              lte: endingSoonThreshold,
            },
          },
          select: {
            id: true,
            userId: true,
            endsAt: true,
          },
          take: this.BATCH_SIZE,
          ...(cursor && { skip: 1, cursor: { id: cursor } }),
          orderBy: { id: 'asc' },
        });

        if (subscriptions.length === 0) break;

        // Process subscriptions in smaller batches for notifications
        for (let i = 0; i < subscriptions.length; i += this.NOTIFICATION_BATCH_SIZE) {
          const batch = subscriptions.slice(i, i + this.NOTIFICATION_BATCH_SIZE);
          
          // Check which ones don't have notifications yet
          const userIdsToNotify: number[] = [];
          
          for (const subscription of batch) {
            try {
              const existingNotification = await this.prisma.notification.findFirst({
                where: {
                  userId: subscription.userId,
                  type: NotificationType.SUBSCRIPTION_ENDING_SOON,
                  createdAt: {
                    gte: new Date(now.getTime() - 48 * 60 * 60 * 1000), // Last 48 hours
                  },
                },
                select: { id: true },
              });

              if (!existingNotification) {
                userIdsToNotify.push(subscription.userId);
              }
            } catch (error) {
              this.logger.error(
                `Error checking subscription ${subscription.id}`,
                error,
              );
            }
          }

          // Create notifications in bulk
          if (userIdsToNotify.length > 0) {
            const notifications = userIdsToNotify.map((userId) => ({
              userId,
              type: NotificationType.SUBSCRIPTION_ENDING_SOON,
              title: 'Subscription Ending Soon',
              message: 'Your subscription is about to end, please check it out',
            }));

            try {
              await this.prisma.notification.createMany({
                data: notifications,
                skipDuplicates: true,
              });
              notificationCount += userIdsToNotify.length;
            } catch (error) {
              this.logger.error('Error creating bulk notifications', error);
            }
          }
        }

        const batchLength = subscriptions.length;
        processedCount += batchLength;
        cursor = subscriptions[batchLength - 1]?.id;

        // Memory cleanup
        subscriptions.length = 0;

        if (batchLength < this.BATCH_SIZE) break;
      }

      this.logger.log(
        `Processed ${processedCount} subscriptions, created ${notificationCount} notifications`,
      );
    } catch (error) {
      this.logger.error('Error checking subscriptions ending soon', error);
    }
  }

  /**
   * Check for expired subscriptions and mark them as expired
   * Uses batch processing for memory efficiency
   */
  private async checkSubscriptionsExpired(): Promise<void> {
    this.logger.log('Checking expired subscriptions...');

    const now = new Date();
    // Check subscriptions that expired in the last hour
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    let cursor: number | undefined = undefined;
    let processedCount = 0;
    let notificationCount = 0;
    let expiredCount = 0;

    try {
      while (true) {
        // Fetch batch of expired subscriptions
        const subscriptions: Array<{
          id: number;
          userId: number;
        }> = await this.prisma.userSubscription.findMany({
          where: {
            status: SubscriptionStatus.ACTIVE,
            endsAt: {
              gte: oneHourAgo,
              lt: now,
            },
          },
          select: {
            id: true,
            userId: true,
          },
          take: this.BATCH_SIZE,
          ...(cursor && { skip: 1, cursor: { id: cursor } }),
          orderBy: { id: 'asc' },
        });

        if (subscriptions.length === 0) break;

        // Process in smaller batches
        for (let i = 0; i < subscriptions.length; i += this.NOTIFICATION_BATCH_SIZE) {
          const batch = subscriptions.slice(i, i + this.NOTIFICATION_BATCH_SIZE);
          
          const notifications: Array<{
            userId: number;
            type: NotificationType;
            title: string;
            message: string;
          }> = [];

          // Use transaction to update status and create notifications atomically
          await this.prisma.$transaction(
            async (tx) => {
              for (const subscription of batch) {
                try {
                  // Update subscription status
                  await tx.userSubscription.update({
                    where: { id: subscription.id },
                    data: { status: SubscriptionStatus.EXPIRED },
                  });
                  expiredCount++;

                  // Check if notification already exists
                  const existingNotification = await tx.notification.findFirst({
                    where: {
                      userId: subscription.userId,
                      type: NotificationType.SUBSCRIPTION_EXPIRED,
                      createdAt: {
                        gte: oneHourAgo,
                      },
                    },
                    select: { id: true },
                  });

                  if (!existingNotification) {
                    notifications.push({
                      userId: subscription.userId,
                      type: NotificationType.SUBSCRIPTION_EXPIRED,
                      title: 'Subscription Expired',
                      message: 'Your subscription has expired',
                    });
                  }
                } catch (error) {
                  this.logger.error(
                    `Error processing expired subscription ${subscription.id}`,
                    error,
                  );
                }
              }

              // Bulk create notifications
              if (notifications.length > 0) {
                await tx.notification.createMany({
                  data: notifications,
                  skipDuplicates: true,
                });
                notificationCount += notifications.length;
              }
            },
            {
              timeout: 30000, // 30 second timeout
            },
          );
        }

        const batchLength = subscriptions.length;
        processedCount += batchLength;
        cursor = subscriptions[batchLength - 1]?.id;

        // Memory cleanup
        subscriptions.length = 0;

        if (batchLength < this.BATCH_SIZE) break;
      }

      this.logger.log(
        `Processed ${processedCount} subscriptions, expired ${expiredCount}, created ${notificationCount} notifications`,
      );
    } catch (error) {
      this.logger.error('Error checking expired subscriptions', error);
    }
  }

  /**
   * Manual trigger for testing purposes
   * Can be called via API endpoint if needed
   */
  async triggerScheduledNotifications(): Promise<void> {
    this.logger.log('Manually triggering scheduled notifications');
    await this.handleScheduledNotifications();
  }
}

