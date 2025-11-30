import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotificationService } from './notification.service';
import {
  SubscriptionStatus,
  NotificationType,
} from 'generated/prisma';

/**
 * Scheduled tasks for time-based notifications
 * Runs daily to check for promotions/subscriptions ending soon or ended
 */
@Injectable()
export class NotificationSchedulerService {
  private readonly logger = new Logger(NotificationSchedulerService.name);

  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  /**
   * Check for promotions ending soon (within 24 hours)
   * Runs every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handlePromotionsEndingSoon() {
    this.logger.log('Checking for promotions ending soon...');

    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setHours(tomorrow.getHours() + 24);

    try {
      const promotionsEndingSoon = await this.prisma.promotion.findMany({
        where: {
          active: true,
          endsAt: {
            gte: now,
            lte: tomorrow,
          },
        },
        include: {
          product: {
            include: {
              store: true,
            },
          },
        },
      });

      for (const promotion of promotionsEndingSoon) {
        // Check if we already sent a notification for this promotion ending soon
        // by checking if there's a notification created in the last 23 hours
        const twentyThreeHoursAgo = new Date(now);
        twentyThreeHoursAgo.setHours(twentyThreeHoursAgo.getHours() - 23);

        const existingNotification = await this.prisma.notification.findFirst({
          where: {
            promotionId: promotion.id,
            type: NotificationType.PROMOTION_ENDING_SOON,
            createdAt: {
              gte: twentyThreeHoursAgo,
            },
          },
        });

        if (!existingNotification && promotion.product?.storeId) {
          await this.notificationService
            .notifyPromotionEndingSoon(promotion.id)
            .catch((err) => {
              this.logger.error(
                `Error notifying promotion ending soon (ID: ${promotion.id}):`,
                err,
              );
            });
        }
      }

      this.logger.log(
        `Checked ${promotionsEndingSoon.length} promotions ending soon`,
      );
    } catch (error) {
      this.logger.error('Error checking promotions ending soon:', error);
    }
  }

  /**
   * Check for promotions that have ended
   * Runs every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handlePromotionsEnded() {
    this.logger.log('Checking for promotions that have ended...');

    const now = new Date();

    try {
      const promotionsEnded = await this.prisma.promotion.findMany({
        where: {
          active: true,
          endsAt: {
            lt: now,
          },
        },
        include: {
          product: {
            include: {
              store: true,
            },
          },
        },
      });

      for (const promotion of promotionsEnded) {
        // Check if we already sent a notification for this promotion ending
        // by checking if there's a notification created in the last hour
        const oneHourAgo = new Date(now);
        oneHourAgo.setHours(oneHourAgo.getHours() - 1);

        const existingNotification = await this.prisma.notification.findFirst({
          where: {
            promotionId: promotion.id,
            type: NotificationType.PROMOTION_ENDED,
            createdAt: {
              gte: oneHourAgo,
            },
          },
        });

        if (!existingNotification && promotion.product?.storeId) {
          await this.notificationService
            .notifyPromotionEnded(promotion.id)
            .catch((err) => {
              this.logger.error(
                `Error notifying promotion ended (ID: ${promotion.id}):`,
                err,
              );
            });

          // Also deactivate the promotion
          await this.prisma.promotion.update({
            where: { id: promotion.id },
            data: { active: false },
          });
        }
      }

      this.logger.log(`Checked ${promotionsEnded.length} promotions that ended`);
    } catch (error) {
      this.logger.error('Error checking promotions that ended:', error);
    }
  }

  /**
   * Check for subscriptions ending soon (within 7 days)
   * Runs daily at midnight
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleSubscriptionsEndingSoon() {
    this.logger.log('Checking for subscriptions ending soon...');

    const now = new Date();
    const sevenDaysLater = new Date(now);
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

    try {
      const subscriptionsEndingSoon = await this.prisma.userSubscription.findMany({
        where: {
          status: SubscriptionStatus.ACTIVE,
          endsAt: {
            gte: now,
            lte: sevenDaysLater,
          },
        },
        include: {
          user: true,
        },
      });

      for (const subscription of subscriptionsEndingSoon) {
        // Check if we already sent a notification for this subscription ending soon
        // by checking if there's a notification created in the last 23 hours
        const twentyThreeHoursAgo = new Date(now);
        twentyThreeHoursAgo.setHours(twentyThreeHoursAgo.getHours() - 23);

        const existingNotification = await this.prisma.notification.findFirst({
          where: {
            userId: subscription.userId,
            type: NotificationType.SUBSCRIPTION_ENDING_SOON,
            createdAt: {
              gte: twentyThreeHoursAgo,
            },
          },
        });

        if (!existingNotification) {
          await this.notificationService
            .notifySubscriptionEndingSoon(subscription.userId)
            .catch((err) => {
              this.logger.error(
                `Error notifying subscription ending soon (User ID: ${subscription.userId}):`,
                err,
              );
            });
        }
      }

      this.logger.log(
        `Checked ${subscriptionsEndingSoon.length} subscriptions ending soon`,
      );
    } catch (error) {
      this.logger.error('Error checking subscriptions ending soon:', error);
    }
  }
}

