import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Notification, NotificationType, Prisma } from 'generated/prisma';
import { CreateNotificationDto } from './dto/create-notification.dto';

@Injectable()
export class NotificationService {
  constructor(private prisma: PrismaService) {}

  /**
   * Creates a single notification
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
   * Creates multiple notifications for multiple users
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
   * Gets notifications for a user
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
   * Marks a notification as read
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
   */
  async notifyPromotionCreated(
    promotionId: number,
    productId?: number,
  ): Promise<void> {
    const promotion = await this.prisma.promotion.findUnique({
      where: { id: promotionId },
      include: { product: { include: { store: true } } },
    });

    if (!promotion) return;

    let userIds: number[] = [];

    if (productId && promotion.product) {
      // Notify users who bookmarked the product
      const productBookmarks = await this.prisma.productBookmark.findMany({
        where: { productId },
        select: { userId: true },
      });
      userIds = productBookmarks.map((b) => b.userId);

      // Also notify users who bookmarked the store
      const storeBookmarks = await this.prisma.storeBookmark.findMany({
        where: { storeId: promotion.product.storeId },
        select: { userId: true },
      });
      const storeUserIds = storeBookmarks.map((b) => b.userId);
      userIds = [...new Set([...userIds, ...storeUserIds])];
    }

    if (userIds.length > 0) {
      await this.createNotificationsForUsers(
        userIds,
        NotificationType.PROMOTION_CREATED,
        `New promotion: ${promotion.title}`,
        `${promotion.description} - ${promotion.discount}% off!`,
        {
          promotionId,
          productId: promotion.productId || undefined,
          storeId: promotion.product?.storeId,
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
      title: isVerified
        ? 'Store verified successfully!'
        : 'Store verification status changed',
      message: isVerified
        ? `Your store "${store.name}" has been verified.`
        : `The verification status of "${store.name}" has been updated.`,
      storeId,
    });
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

