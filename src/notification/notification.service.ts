import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  Notification,
  NotificationType,
  Prisma,
  UserRole,
  DealType,
} from 'generated/prisma';
import { CreateNotificationDto } from './dto/create-notification.dto';

/**
 * Notification Service
 * 
 * Provides notification management operations for the application.
 * Handles creating, retrieving, and managing user notifications.
 * 
 * Features:
 * - Single and bulk notification creation
 * - User notification retrieval with filtering and pagination
 * - Mark notifications as read/unread
 * - Delete notifications
 * - Specialized notification methods for various events (product created, promotion ending, etc.)
 * 
 * Notification Types:
 * - Product-related: New products, price changes, stock updates
 * - Promotion-related: New promotions, promotions ending soon, promotions ended
 * - Store-related: Store verification, store under review
 * - Subscription-related: New subscriptions available, subscriptions ending soon, expired
 * - User-related: Welcome messages, account updates
 */
@Injectable()
export class NotificationService {
  constructor(private prisma: PrismaService) {}

  /**
   * Formats a promotion message based on deal type
   * 
   * @param promotion - Promotion object with dealType and deal-specific fields
   * @returns Formatted message string describing the promotion
   * @private
   */
  private formatPromotionMessage(promotion: any): string {
    switch (promotion.dealType) {
      case DealType.PERCENTAGE_DISCOUNT:
        return `${promotion.description} - ${promotion.percentageOff}% off!`;
      case DealType.FIXED_DISCOUNT:
        return `${promotion.description} - ${promotion.fixedAmountOff} PHP off!`;
      case DealType.BOGO:
        return `${promotion.description} - Buy ${promotion.buyQuantity} Get ${promotion.getQuantity} free!`;
      case DealType.BUNDLE:
        return `${promotion.description} - Bundle for ${promotion.bundlePrice} PHP!`;
      case DealType.QUANTITY_DISCOUNT:
        return `${promotion.description} - Buy ${promotion.minQuantity}+ and get ${promotion.quantityDiscount}% off!`;
      default:
        return promotion.description;
    }
  }

  /**
   * Creates a single notification for a user.
   * 
   * @param data - Notification creation data
   * @returns Promise resolving to the created notification
   * @throws {PrismaClientKnownRequestError} If notification creation fails
   */
  async createNotification(
    data: CreateNotificationDto,
  ): Promise<Notification> {
    return this.prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        productId: data.productId,
        storeId: data.storeId,
        promotionId: data.promotionId,
      },
    });
  }

  /**
   * Creates multiple notifications for multiple users in a single operation.
   * 
   * This is more efficient than creating notifications one by one.
   * Returns an empty array if no user IDs are provided.
   * 
   * @param userIds - Array of user IDs to create notifications for
   * @param type - Type of notification
   * @param title - Notification title
   * @param message - Notification message
   * @param metadata - Optional metadata (productId, storeId, promotionId)
   * @returns Promise resolving to an array of created notifications
   */
  async createNotificationsForUsers(
    userIds: number[],
    type: NotificationType,
    title: string,
    message: string,
    metadata?: {
      productId?: number;
      storeId?: number;
      promotionId?: number;
    },
  ): Promise<Notification[]> {
    if (userIds.length === 0) return [];

    const notifications = userIds.map((userId) => ({
      userId,
      type,
      title,
      message,
      productId: metadata?.productId,
      storeId: metadata?.storeId,
      promotionId: metadata?.promotionId,
    }));

    return this.prisma.notification.createManyAndReturn({
      data: notifications,
    });
  }

  /**
   * Retrieves notifications for a user with optional filtering and pagination.
   * 
   * Results are ordered by creation date (newest first).
   * 
   * @param userId - ID of the user whose notifications to retrieve
   * @param params - Optional query parameters
   * @param params.skip - Number of records to skip for pagination
   * @param params.take - Number of records to return
   * @param params.read - Filter by read status (true for read, false for unread, undefined for all)
   * @returns Promise resolving to an array of notifications
   */
  async getUserNotifications(
    userId: number,
    params?: {
      skip?: number;
      take?: number;
      read?: boolean;
    },
  ): Promise<Notification[]> {
    const { skip, take, read } = params || {};
    const where: Prisma.NotificationWhereInput = { userId };

    if (read !== undefined) {
      where.read = read;
    }

    return this.prisma.notification.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Marks a notification as read for a specific user.
   * 
   * Sets the read flag to true and records the read timestamp.
   * Users can only mark their own notifications as read.
   * 
   * @param notificationId - ID of the notification to mark as read
   * @param userId - ID of the user (for authorization check)
   * @returns Promise resolving to the updated notification
   * @throws {PrismaClientKnownRequestError} If notification not found or doesn't belong to user
   */
  async markAsRead(notificationId: number, userId: number): Promise<Notification> {
    return this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        read: true,
        readAt: new Date(),
      },
    });
  }

  /**
   * Marks all notifications as read for a user
   */
  async markAllAsRead(userId: number): Promise<{ count: number }> {
    return this.prisma.notification.updateMany({
      where: {
        userId,
        read: false,
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    });
  }

  /**
   * Gets unread notification count for a user
   */
  async getUnreadCount(userId: number): Promise<number> {
    return this.prisma.notification.count({
      where: {
        userId,
        read: false,
      },
    });
  }

  /**
   * Deletes a notification
   */
  async deleteNotification(
    notificationId: number,
    userId: number,
  ): Promise<Notification> {
    return this.prisma.notification.delete({
      where: { id: notificationId },
    });
  }

  // ========== Automatic Notification Methods ==========

  /**
   * Notifies users who bookmarked a store when a new product is created
   */
  async notifyProductCreated(productId: number, storeId: number): Promise<void> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { store: true },
    });

    if (!product) return;

    const bookmarks = await this.prisma.storeBookmark.findMany({
      where: { storeId },
      select: { userId: true },
    });

    const userIds = bookmarks.map((b) => b.userId);

    if (userIds.length > 0) {
      await this.createNotificationsForUsers(
        userIds,
        NotificationType.PRODUCT_CREATED,
        `New product at ${product.store.name}`,
        `${product.name} has been added to ${product.store.name}`,
        { productId, storeId },
      );
    }
  }

  /**
   * Notifies users who bookmarked a product when price changes
   */
  async notifyProductPriceChanged(
    productId: number,
    oldPrice: number,
    newPrice: number,
  ): Promise<void> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { store: true },
    });

    if (!product) return;

    const bookmarks = await this.prisma.productBookmark.findMany({
      where: { productId },
      select: { userId: true },
    });

    const userIds = bookmarks.map((b) => b.userId);

    if (userIds.length > 0) {
      const priceChange = oldPrice > newPrice ? 'decreased' : 'increased';
      await this.createNotificationsForUsers(
        userIds,
        NotificationType.PRODUCT_PRICE_CHANGED,
        `Price ${priceChange} for ${product.name}`,
        `The price of ${product.name} has ${priceChange} from $${oldPrice} to $${newPrice}`,
        { productId, storeId: product.storeId },
      );
    }
  }

  /**
   * Notifies users who bookmarked a product when stock changes
   */
  async notifyProductStockChanged(
    productId: number,
    oldStock: number,
    newStock: number,
  ): Promise<void> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { store: true },
    });

    if (!product) return;

    // Only notify if stock becomes available (was 0, now > 0) or if stock is low
    if (oldStock === 0 && newStock > 0) {
      const bookmarks = await this.prisma.productBookmark.findMany({
        where: { productId },
        select: { userId: true },
      });

      const userIds = bookmarks.map((b) => b.userId);

      if (userIds.length > 0) {
        await this.createNotificationsForUsers(
          userIds,
          NotificationType.PRODUCT_STOCK_CHANGED,
          `${product.name} is back in stock!`,
          `${product.name} is now available at ${product.store.name}`,
          { productId, storeId: product.storeId },
        );
      }
    } else if (newStock > 0 && newStock <= 5) {
      // Notify when stock is low
      const bookmarks = await this.prisma.productBookmark.findMany({
        where: { productId },
        select: { userId: true },
      });

      const userIds = bookmarks.map((b) => b.userId);

      if (userIds.length > 0) {
        await this.createNotificationsForUsers(
          userIds,
          NotificationType.PRODUCT_STOCK_CHANGED,
          `Low stock: ${product.name}`,
          `Only ${newStock} left in stock for ${product.name}`,
          { productId, storeId: product.storeId },
        );
      }
    }
  }

  /**
   * Notifies users who bookmarked a product when promotion is created
   * 
   * @param promotionId - The promotion ID
   * @param productId - The product ID that triggered the notification
   */
  async notifyPromotionCreated(
    promotionId: number,
    productId?: number,
  ): Promise<void> {
    const promotion = await this.prisma.promotion.findUnique({
      where: { id: promotionId },
      include: {
        promotionProducts: {
          include: {
            product: {
              include: { store: true },
            },
          },
        },
      },
    });

    if (!promotion) return;

    let userIds: number[] = [];

    if (productId) {
      // Notify users who bookmarked the product
      const productBookmarks = await this.prisma.productBookmark.findMany({
        where: { productId },
        select: { userId: true },
      });
      userIds = productBookmarks.map((b) => b.userId);

      // Also notify users who bookmarked the store
      const promotionProduct = promotion.promotionProducts.find(
        (pp) => pp.productId === productId,
      );
      if (promotionProduct) {
        const storeBookmarks = await this.prisma.storeBookmark.findMany({
          where: { storeId: promotionProduct.product.storeId },
          select: { userId: true },
        });
        const storeUserIds = storeBookmarks.map((b) => b.userId);
        userIds = [...new Set([...userIds, ...storeUserIds])];
      }
    }

    if (userIds.length > 0) {
      await this.createNotificationsForUsers(
        userIds,
        NotificationType.PROMOTION_CREATED,
        `New promotion: ${promotion.title}`,
        this.formatPromotionMessage(promotion),
        {
          promotionId,
          productId: productId || undefined,
        },
      );
    }
  }

  /**
   * Notifies store owner when store verification status changes
   */
  async notifyStoreVerificationStatusChanged(
    storeId: number,
    isVerified: boolean,
  ): Promise<void> {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      include: { owner: true },
    });

    if (!store) return;

    await this.createNotification({
      userId: store.ownerId,
      type: NotificationType.STORE_VERIFIED,
      title: isVerified ? 'Store Approved!' : 'Store verification status changed',
      message: isVerified
        ? 'You are now approve, you can now show your products on the air'
        : `The verification status of "${store.name}" has been updated.`,
      storeId,
    });
  }

  // ========== Retailer Notifications ==========

  /**
   * Notifies retailer that their store is under review
   */
  async notifyStoreUnderReview(storeId: number): Promise<void> {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      include: { owner: true },
    });

    if (!store) return;

    await this.createNotification({
      userId: store.ownerId,
      type: NotificationType.STORE_UNDER_REVIEW,
      title: 'Store Review in Progress',
      message: 'Please wait for a moment, admin is reviewing your store',
      storeId,
    });
  }

  /**
   * Notifies retailers about PRO subscription tier availability
   * 
   * Note: With fixed tiers (BASIC/PRO), this is primarily used for
   * promotional purposes to remind retailers about upgrading.
   */
  async notifyNewSubscriptionAvailable(): Promise<void> {
    // Get all retailers on BASIC tier
    const retailers = await this.prisma.user.findMany({
      where: {
        role: UserRole.RETAILER,
        subscriptionTier: 'BASIC',
      },
      select: { id: true },
    });

    const retailerIds = retailers.map((r) => r.id);

    if (retailerIds.length > 0) {
      await this.createNotificationsForUsers(
        retailerIds,
        NotificationType.SUBSCRIPTION_AVAILABLE,
        'Upgrade to PRO!',
        'Unlock unlimited products and promotions with PRO tier for only 100 PHP/month!',
      );
    }
  }

  /**
   * Notifies retailer that their promotion is about to end
   */
  async notifyPromotionEndingSoon(promotionId: number): Promise<void> {
    const promotion = await this.prisma.promotion.findUnique({
      where: { id: promotionId },
      include: {
        promotionProducts: {
          include: {
            product: {
              include: { store: true },
            },
          },
          take: 1, // Just need one to get store info
        },
      },
    });

    if (!promotion || !promotion.endsAt || promotion.promotionProducts.length === 0) return;

    const store = promotion.promotionProducts[0].product.store;

    await this.createNotification({
      userId: store.ownerId,
      type: NotificationType.PROMOTION_ENDING_SOON,
      title: 'Promotion Ending Soon',
      message: `Your promotion "${promotion.title}" is about to end, please check it out`,
      promotionId,
      storeId: store.id,
    });
  }

  /**
   * Notifies retailer that their promotion has ended
   */
  async notifyPromotionEnded(promotionId: number): Promise<void> {
    const promotion = await this.prisma.promotion.findUnique({
      where: { id: promotionId },
      include: {
        promotionProducts: {
          include: {
            product: {
              include: { store: true },
            },
          },
          take: 1, // Just need one to get store info
        },
      },
    });

    if (!promotion || promotion.promotionProducts.length === 0) return;

    const store = promotion.promotionProducts[0].product.store;

    await this.createNotification({
      userId: store.ownerId,
      type: NotificationType.PROMOTION_ENDED,
      title: 'Promotion Ended',
      message: `Your promotion "${promotion.title}" has ended`,
      promotionId,
      storeId: store.id,
    });
  }

  /**
   * Notifies retailer about PRO tier renewal
   * 
   * Note: With fixed tiers, this is used for billing reminders.
   * In a full implementation, this would be triggered by payment processor.
   */
  async notifySubscriptionEndingSoon(userId: number): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { subscriptionTier: true, role: true },
    });

    if (!user || user.subscriptionTier !== 'PRO') return;

    await this.createNotification({
      userId,
      type: NotificationType.SUBSCRIPTION_ENDING_SOON,
      title: 'PRO Subscription Renewal Due',
      message: 'Your PRO subscription payment is due soon. Please ensure payment to maintain PRO benefits.',
    });
  }

  // ========== Consumer Notifications ==========

  /**
   * Welcomes a new consumer user
   */
  async notifyConsumerWelcome(userId: number): Promise<void> {
    await this.createNotification({
      userId,
      type: NotificationType.CONSUMER_WELCOME,
      title: 'Welcome!',
      message: 'Welcome consumer, please enjoy and find products, deals near you!',
    });
  }

  /**
   * Notifies consumer about promotions nearby their location
   */
  async notifyPromotionNearby(
    userId: number,
    promotionId: number,
    storeId: number,
  ): Promise<void> {
    const promotion = await this.prisma.promotion.findUnique({
      where: { id: promotionId },
    });

    if (!promotion) return;

    await this.createNotification({
      userId,
      type: NotificationType.PROMOTION_NEARBY,
      title: 'Promotion Nearby!',
      message: `${promotion.title} - ${this.formatPromotionMessage(promotion)} Check it out!`,
      promotionId,
      storeId,
    });
  }

  /**
   * Reminds consumer to turn on GPS
   */
  async notifyGpsReminder(userId: number): Promise<void> {
    await this.createNotification({
      userId,
      type: NotificationType.GPS_REMINDER,
      title: 'GPS Reminder',
      message:
        'Be advised, turn on your gps so that we can track your position accurately',
    });
  }

  // ========== Admin Notifications ==========

  /**
   * Notifies all admins when a store is created and waiting for approval
   */
  async notifyAdminStoreCreated(storeId: number): Promise<void> {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
    });

    if (!store) return;

    // Get all admin users
    const admins = await this.prisma.user.findMany({
      where: { role: UserRole.ADMIN },
      select: { id: true },
    });

    const adminIds = admins.map((a) => a.id);

    if (adminIds.length > 0) {
      await this.createNotificationsForUsers(
        adminIds,
        NotificationType.STORE_CREATED,
        'New Store Created',
        'A store is created, waiting for your approval',
        { storeId },
      );
    }
  }

  /**
   * Notifies all admins about questionable product pricing
   */
  async notifyAdminQuestionableProductPricing(
    productId: number,
    storeId: number,
  ): Promise<void> {
    // Get all admin users
    const admins = await this.prisma.user.findMany({
      where: { role: UserRole.ADMIN },
      select: { id: true },
    });

    const adminIds = admins.map((a) => a.id);

    if (adminIds.length > 0) {
      await this.createNotificationsForUsers(
        adminIds,
        NotificationType.QUESTIONABLE_PRICING_PRODUCT,
        'Questionable Product Pricing',
        `A product has made but has questionable pricing, (${storeId})`,
        { productId, storeId },
      );
    }
  }

  /**
   * Notifies all admins about questionable promotion pricing
   */
  async notifyAdminQuestionablePromotionPricing(
    promotionId: number,
    storeId: number,
  ): Promise<void> {
    // Get all admin users
    const admins = await this.prisma.user.findMany({
      where: { role: UserRole.ADMIN },
      select: { id: true },
    });

    const adminIds = admins.map((a) => a.id);

    if (adminIds.length > 0) {
      await this.createNotificationsForUsers(
        adminIds,
        NotificationType.QUESTIONABLE_PRICING_PROMOTION,
        'Questionable Promotion Pricing',
        `A promotion has made but has questionable pricing, (${storeId})`,
        { promotionId, storeId },
      );
    }
  }

  /**
   * Notifies user when subscription status changes
   */
  async notifySubscriptionStatusChanged(
    userId: number,
    type: NotificationType,
    title: string,
    message: string,
  ): Promise<void> {
    await this.createNotification({
      userId,
      type,
      title,
      message,
    });
  }
}

