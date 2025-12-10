import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { AddProductsToPromotionDto } from './dto/add-products-to-promotion.dto';
import { NotificationService } from '../notification/notification.service';
import {
  isQuestionablePromotionDiscount,
} from 'src/notification/utils/pricing-validation.util';
import { SubscriptionTier, UserRole } from 'generated/prisma';

/**
 * Promotion Service
 * 
 * Provides promotion data access and manipulation operations.
 * Handles CRUD operations for product promotions with many-to-many relationships.
 * 
 * Features:
 * - Automatic notification triggers for promotion creation
 * - Questionable discount detection and admin alerts
 * - Active promotion filtering based on date ranges
 * - Bookmark notifications when promotions are created
 * - Subscription tier limit enforcement (BASIC: 5 promotions, PRO: unlimited)
 * - Products per promotion limit (BASIC: 10 products, PRO: unlimited)
 * 
 * Many-to-Many Relationship:
 * - Promotions can have multiple products
 * - Products can be in multiple promotions
 * - Managed through PromotionProduct junction table
 */
@Injectable()
export class PromotionService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  /**
   * Creates a new promotion with associated products.
   * 
   * After creation, automatically:
   * - Checks for questionable discount pricing and notifies admins if detected
   * - Notifies users who bookmarked the products or stores about the new promotion
   * 
   * @param createPromotionDto - The data for creating the promotion including product IDs
   * @param userId - The user ID creating the promotion (for ownership validation)
   * @returns Promise resolving to the newly created promotion (with product relations)
   * @throws {BadRequestException} If promotion creation fails or products don't exist
   * @throws {ForbiddenException} If products don't belong to user's stores or tier limit exceeded
   * 
   * @example
   * ```typescript
   * const promotion = await promotionService.create({
   *   title: 'Summer Sale',
   *   type: 'percentage',
   *   description: '25% off',
   *   discount: 25,
   *   productIds: [1, 2, 3],
   * }, userId);
   * ```
   */
  async create(createPromotionDto: CreatePromotionDto, userId: number) {
    const { productIds, ...promotionData } = createPromotionDto;

    // Get user info for validation
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { 
        subscriptionTier: true, 
        role: true,
      },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Verify all products exist
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, price: true, storeId: true },
    });

    if (products.length !== productIds.length) {
      throw new BadRequestException('One or more products not found');
    }

    // For retailers, verify all products belong to their stores
    if (user.role === UserRole.RETAILER) {
      const stores = await this.prisma.store.findMany({
        where: { ownerId: userId },
        select: { id: true },
      });
      const userStoreIds = stores.map((s) => s.id);
      const invalidProducts = products.filter((p) => !userStoreIds.includes(p.storeId));
      
      if (invalidProducts.length > 0) {
        throw new ForbiddenException('You can only create promotions for products in your own stores');
      }

      // Check products per promotion limit for BASIC tier
      if (user.subscriptionTier === SubscriptionTier.BASIC && productIds.length > 10) {
        throw new ForbiddenException(
          'BASIC tier allows a maximum of 10 products per promotion. Upgrade to PRO for unlimited products per promotion.',
        );
      }
    }

    // Create promotion with product relationships
    const promotion = await this.prisma.promotion.create({
      data: {
        ...promotionData,
        promotionProducts: {
          create: productIds.map((productId) => ({
            productId,
          })),
        },
      },
      include: {
        promotionProducts: {
          include: {
            product: {
              select: {
                id: true,
                price: true,
                storeId: true,
              },
            },
          },
        },
      },
    });

    // Check for questionable pricing and notify admins
    for (const pp of promotion.promotionProducts) {
      const originalPrice = Number(pp.product.price);
      const discountedPrice = originalPrice * (1 - promotion.discount / 100);

      if (
        isQuestionablePromotionDiscount(
          promotion.discount,
          originalPrice,
          discountedPrice,
        )
      ) {
        this.notificationService
          .notifyAdminQuestionablePromotionPricing(
            promotion.id,
            pp.product.storeId,
          )
          .catch((err: unknown) => {
            console.error(
              'Error creating questionable pricing notification:',
              err,
            );
          });
        break; // Only notify once per promotion
      }
    }

    // Notify users who bookmarked any of the products
    for (const productId of productIds) {
      this.notificationService
        .notifyPromotionCreated(promotion.id, productId)
        .catch((err: unknown) => {
          console.error('Error creating promotion notification:', err);
        });
    }

    return promotion;
  }

  /**
   * Adds products to an existing promotion.
   * 
   * Checks subscription tier limits before adding products.
   * 
   * @param promotionId - The promotion ID to add products to
   * @param userId - The user ID (for tier checking)
   * @param addProductsDto - DTO containing product IDs to add
   * @returns Promise resolving to the updated promotion
   * @throws {BadRequestException} If promotion not found or products don't exist
   * @throws {ForbiddenException} If tier limit exceeded
   * 
   * @example
   * ```typescript
   * const promotion = await promotionService.addProductsToPromotion(
   *   1,
   *   userId,
   *   { productIds: [4, 5] }
   * );
   * ```
   */
  async addProductsToPromotion(
    promotionId: number,
    userId: number,
    addProductsDto: AddProductsToPromotionDto,
  ) {
    const { productIds } = addProductsDto;

    // Get promotion
    const promotion = await this.prisma.promotion.findUnique({
      where: { id: promotionId },
      include: {
        promotionProducts: true,
      },
    });

    if (!promotion) {
      throw new BadRequestException('Promotion not found');
    }

    // Get user tier
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { subscriptionTier: true, role: true },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Check tier limit for products per promotion (only for retailers on BASIC)
    if (user.role === UserRole.RETAILER && user.subscriptionTier === SubscriptionTier.BASIC) {
      const totalProducts = promotion.promotionProducts.length + productIds.length;
      if (totalProducts > 10) {
        throw new ForbiddenException(
          'BASIC tier allows a maximum of 10 products per promotion. Upgrade to PRO for unlimited products per promotion.',
        );
      }
    }

    // Verify all products exist
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true },
    });

    if (products.length !== productIds.length) {
      throw new BadRequestException('One or more products not found');
    }

    // Add products to promotion (skip if already exists)
    const existingProductIds = promotion.promotionProducts.map((pp) => pp.productId);
    const newProductIds = productIds.filter((id) => !existingProductIds.includes(id));

    if (newProductIds.length === 0) {
      throw new BadRequestException('All products are already in this promotion');
    }

    await this.prisma.promotion.update({
      where: { id: promotionId },
      data: {
        promotionProducts: {
          create: newProductIds.map((productId) => ({
            productId,
          })),
        },
      },
    });

    return this.findOne(promotionId);
  }

  /**
   * Retrieves all promotions from the database.
   * 
   * @returns Promise resolving to an array of all promotions with product relations
   */
  findAll() {
    return this.prisma.promotion.findMany({
      include: {
        promotionProducts: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  /**
   * Retrieves a single promotion by its ID.
   * 
   * @param id - Promotion ID
   * @returns Promise resolving to the found promotion with product relations or null if not found
   */
  findOne(id: number) {
    return this.prisma.promotion.findUnique({
      where: { id },
      include: {
        promotionProducts: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  /**
   * Updates an existing promotion in the database.
   * 
   * Note: To update products in the promotion, use addProductsToPromotion or removeProductsFromPromotion.
   * 
   * @param id - Promotion ID to update
   * @param updatePromotionDto - The data to update the promotion with
   * @returns Promise resolving to the updated promotion
   * @throws {PrismaClientKnownRequestError} If the promotion is not found
   */
  update(id: number, updatePromotionDto: UpdatePromotionDto) {
    // Remove productIds if present in update DTO (handled separately)
    const { productIds, ...updateData } = updatePromotionDto as UpdatePromotionDto & { productIds?: number[] };

    return this.prisma.promotion.update({
      where: { id },
      data: updateData,
      include: {
        promotionProducts: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  /**
   * Deletes a promotion from the database.
   * 
   * Also removes all product associations (cascade delete via schema).
   * 
   * @param id - Promotion ID to delete
   * @returns Promise resolving to the deleted promotion
   * @throws {PrismaClientKnownRequestError} If the promotion is not found
   */
  remove(id: number) {
    return this.prisma.promotion.delete({
      where: { id },
    });
  }

  /**
   * Finds all active promotions.
   * 
   * A promotion is considered active if:
   * - The active flag is true
   * - The current date is on or after startsAt
   * - Either endsAt is null OR the current date is before or equal to endsAt
   * 
   * @returns Promise resolving to an array of active promotions with product relations
   */
  findActive() {
    const now = new Date();
    return this.prisma.promotion.findMany({
      where: {
        active: true,
        startsAt: {
          lte: now,
        },
        OR: [
          { endsAt: null },
          {
            endsAt: {
              gte: now,
            },
          },
        ],
      },
      include: {
        promotionProducts: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  /**
   * Removes products from a promotion.
   * 
   * @param promotionId - The promotion ID to remove products from
   * @param productIds - Array of product IDs to remove
   * @returns Promise resolving to the updated promotion
   * @throws {BadRequestException} If promotion not found
   */
  async removeProductsFromPromotion(
    promotionId: number,
    productIds: number[],
  ) {
    const promotion = await this.prisma.promotion.findUnique({
      where: { id: promotionId },
    });

    if (!promotion) {
      throw new BadRequestException('Promotion not found');
    }

    await this.prisma.promotionProduct.deleteMany({
      where: {
        promotionId,
        productId: {
          in: productIds,
        },
      },
    });

    return this.findOne(promotionId);
  }

  /**
   * Checks if a retailer can create more promotions based on their tier.
   * 
   * @param userId - The retailer user ID
   * @returns Promise resolving to true if can create, false otherwise
   */
  async canCreatePromotion(userId: number): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { subscriptionTier: true, role: true },
    });

    if (!user || user.role !== UserRole.RETAILER) {
      return true; // Not a retailer or user not found, let controller handle
    }

    // PRO tier has no limits
    if (user.subscriptionTier === SubscriptionTier.PRO) {
      return true;
    }

    // BASIC tier: max 5 promotions
    const stores = await this.prisma.store.findMany({
      where: { ownerId: userId },
      select: { id: true },
    });

    const storeIds = stores.map((s) => s.id);

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

    return promotionCount < 5;
  }
}
