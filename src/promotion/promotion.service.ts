import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { AddProductsToPromotionDto } from './dto/add-products-to-promotion.dto';
import { GenerateVoucherTokenDto } from './dto/generate-voucher-token.dto';
import { VoucherTokenResponseDto, VoucherVerificationResponseDto } from './dto/voucher-token-response.dto';
import { NotificationService } from '../notification/notification.service';
import {
  isQuestionablePromotionDiscount,
} from 'src/notification/utils/pricing-validation.util';
import { SubscriptionTier, UserRole, DealType, Prisma, VoucherRedemptionStatus } from 'generated/prisma';
import { PROMOTION_ERRORS } from './constants/error-messages';
import { JwtService } from '@nestjs/jwt';

/**
 * Promotion Service
 * 
 * Provides promotion data access and manipulation operations.
 * Handles CRUD operations for product promotions with support for multiple deal types.
 * 
 * Supported Deal Types:
 * - PERCENTAGE_DISCOUNT: Percentage off products (e.g., 25% off)
 * - FIXED_DISCOUNT: Fixed amount off (e.g., $10 off)
 * - BOGO: Buy X Get Y free deals
 * - BUNDLE: Buy multiple products for a fixed price
 * - QUANTITY_DISCOUNT: Discount when buying a minimum quantity
 * 
 * Features:
 * - Automatic notification triggers for promotion creation
 * - Questionable discount detection and admin alerts
 * - Active promotion filtering based on date ranges
 * - Bookmark notifications when promotions are created
 * - Subscription tier limit enforcement (BASIC: 5 promotions, PRO: unlimited)
 * - Products per promotion limit (BASIC: 10 products, PRO: unlimited)
 * - Deal-specific validation and price calculations
 * 
 * Many-to-Many Relationship:
 * - Promotions can have multiple products
 * - Products can be in multiple promotions
 * - Managed through PromotionProduct junction table
 */
@Injectable()
export class PromotionService {
  private readonly logger = new Logger(PromotionService.name);

  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
    private jwtService: JwtService,
  ) {}

  /**
   * Creates a new promotion with associated products.
   * 
   * Supports multiple deal types: percentage discount, fixed discount, BOGO, bundle, quantity discount.
   * 
   * After creation, automatically:
   * - Validates deal-specific configuration
   * - Checks for questionable discount pricing and notifies admins if detected
   * - Notifies users who bookmarked the products or stores about the new promotion
   * 
   * @param createPromotionDto - The data for creating the promotion including product IDs and deal configuration
   * @param userId - The user ID creating the promotion (for ownership validation)
   * @returns Promise resolving to the newly created promotion (with product relations)
   * @throws {BadRequestException} If promotion creation fails, products don't exist, or invalid deal configuration
   * @throws {ForbiddenException} If products don't belong to user's stores or tier limit exceeded
   * 
   * @example
   * ```typescript
   * // Percentage discount
   * const promotion1 = await promotionService.create({
   *   title: 'Summer Sale',
   *   dealType: DealType.PERCENTAGE_DISCOUNT,
   *   description: '25% off',
   *   percentageOff: 25,
   *   productIds: [1, 2, 3],
   * }, userId);
   * 
   * // BOGO deal
   * const promotion2 = await promotionService.create({
   *   title: 'Buy 1 Get 1',
   *   dealType: DealType.BOGO,
   *   description: 'Buy one, get one free',
   *   buyQuantity: 1,
   *   getQuantity: 1,
   *   productIds: [4, 5],
   * }, userId);
   * ```
   */
  async create(createPromotionDto: CreatePromotionDto, userId: number) {
    const { productIds, dealType, ...baseData } = createPromotionDto;

    // Get user info for validation
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        subscriptionTier: true,
        role: true,
      },
    });

    if (!user) {
      throw new BadRequestException(PROMOTION_ERRORS.USER_NOT_FOUND);
    }

    // Verify all products exist
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, price: true, storeId: true },
    });

    if (products.length !== productIds.length) {
      throw new BadRequestException(PROMOTION_ERRORS.PRODUCTS_NOT_FOUND);
    }

    // For retailers, verify all products belong to their stores
    if (user.role === UserRole.RETAILER) {
      const stores = await this.prisma.store.findMany({
        where: { ownerId: userId },
        select: { id: true },
      });
      const userStoreIds = stores.map((s) => s.id);
      const invalidProducts = products.filter(
        (p) => !userStoreIds.includes(p.storeId),
      );

      if (invalidProducts.length > 0) {
        throw new ForbiddenException(
          PROMOTION_ERRORS.UNAUTHORIZED_PRODUCTS,
        );
      }

      // Check products per promotion limit for BASIC tier
      if (
        user.subscriptionTier === SubscriptionTier.BASIC &&
        productIds.length > 10
      ) {
        throw new ForbiddenException(
          PROMOTION_ERRORS.TIER_LIMIT_PRODUCTS_PER_PROMOTION,
        );
      }
    }

    // Validate deal-specific requirements
    this.validateDealConfiguration(dealType, createPromotionDto, productIds.length);

    // Build promotion data based on deal type
    const promotionData = this.buildPromotionData(createPromotionDto);

    // Create promotion with product relationships
    const promotion = await this.prisma.promotion.create({
      data: {
        ...promotionData,
        promotionProducts: {
          create: productIds.map((productId, index) => {
            // For BOGO deals, assign product roles
            let productRole = 'default';
            if (dealType === DealType.BOGO && createPromotionDto.buyQuantity) {
              productRole =
                index < createPromotionDto.buyQuantity ? 'buy' : 'get';
            }
            return {
              productId,
              productRole,
            };
          }),
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
    this.checkQuestionablePricing(promotion, products);

    // Notify users who bookmarked any of the products
    for (const productId of productIds) {
      this.notificationService
        .notifyPromotionCreated(promotion.id, productId)
        .catch((err: unknown) => {
          this.logger.error('Error creating promotion notification:', err);
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

  /**
   * Validates deal configuration based on deal type.
   * Throws detailed errors if configuration is invalid.
   * 
   * @param dealType - The type of deal
   * @param dto - The create promotion DTO
   * @param productCount - Number of products in the promotion
   * @throws {BadRequestException} If configuration is invalid
   * @private
   */
  private validateDealConfiguration(
    dealType: DealType,
    dto: CreatePromotionDto,
    productCount: number,
  ): void {
    switch (dealType) {
      case DealType.PERCENTAGE_DISCOUNT:
        if (
          dto.percentageOff === undefined ||
          dto.percentageOff === null ||
          dto.percentageOff <= 0 ||
          dto.percentageOff > 100
        ) {
          throw new BadRequestException(
            PROMOTION_ERRORS.PERCENTAGE_OUT_OF_RANGE,
          );
        }
        break;

      case DealType.FIXED_DISCOUNT:
        if (
          dto.fixedAmountOff === undefined ||
          dto.fixedAmountOff === null ||
          dto.fixedAmountOff <= 0
        ) {
          throw new BadRequestException(
            PROMOTION_ERRORS.FIXED_AMOUNT_NEGATIVE,
          );
        }
        break;

      case DealType.BOGO:
        if (
          dto.buyQuantity === undefined ||
          dto.buyQuantity === null ||
          dto.buyQuantity <= 0
        ) {
          throw new BadRequestException(
            PROMOTION_ERRORS.BUY_QUANTITY_INVALID,
          );
        }
        if (
          dto.getQuantity === undefined ||
          dto.getQuantity === null ||
          dto.getQuantity <= 0
        ) {
          throw new BadRequestException(
            PROMOTION_ERRORS.GET_QUANTITY_INVALID,
          );
        }
        if (productCount < 1) {
          throw new BadRequestException(
            PROMOTION_ERRORS.BOGO_INSUFFICIENT_PRODUCTS,
          );
        }
        break;

      case DealType.BUNDLE:
        if (
          dto.bundlePrice === undefined ||
          dto.bundlePrice === null ||
          dto.bundlePrice <= 0
        ) {
          throw new BadRequestException(
            PROMOTION_ERRORS.BUNDLE_PRICE_NEGATIVE,
          );
        }
        if (productCount < 2) {
          throw new BadRequestException(
            PROMOTION_ERRORS.BUNDLE_INSUFFICIENT_PRODUCTS,
          );
        }
        break;

      case DealType.QUANTITY_DISCOUNT:
        if (
          dto.minQuantity === undefined ||
          dto.minQuantity === null ||
          dto.minQuantity <= 1
        ) {
          throw new BadRequestException(
            PROMOTION_ERRORS.MIN_QUANTITY_TOO_LOW,
          );
        }
        if (
          dto.quantityDiscount === undefined ||
          dto.quantityDiscount === null ||
          dto.quantityDiscount <= 0 ||
          dto.quantityDiscount > 100
        ) {
          throw new BadRequestException(
            PROMOTION_ERRORS.QUANTITY_DISCOUNT_OUT_OF_RANGE,
          );
        }
        break;

      case DealType.VOUCHER:
        if (
          dto.voucherValue === undefined ||
          dto.voucherValue === null ||
          dto.voucherValue <= 0
        ) {
          throw new BadRequestException(
            PROMOTION_ERRORS.VOUCHER_VALUE_NEGATIVE,
          );
        }
        break;

      default:
        throw new BadRequestException(PROMOTION_ERRORS.INVALID_DEAL_TYPE);
    }
  }

  /**
   * Builds Prisma create data from DTO based on deal type.
   * Only includes relevant fields for the specific deal type.
   * 
   * @param dto - The create promotion DTO
   * @returns Prisma create data without product relations
   * @private
   */
  private buildPromotionData(
    dto: CreatePromotionDto,
  ): Omit<Prisma.PromotionCreateInput, 'promotionProducts'> {
    const baseData: Prisma.PromotionCreateInput = {
      title: dto.title,
      dealType: dto.dealType,
      description: dto.description,
      startsAt: dto.startsAt,
      endsAt: dto.endsAt,
      active: dto.active,
    };

    // Add deal-specific fields
    switch (dto.dealType) {
      case DealType.PERCENTAGE_DISCOUNT:
        return {
          ...baseData,
          percentageOff: dto.percentageOff,
        };

      case DealType.FIXED_DISCOUNT:
        return {
          ...baseData,
          fixedAmountOff: dto.fixedAmountOff,
        };

      case DealType.BOGO:
        return {
          ...baseData,
          buyQuantity: dto.buyQuantity,
          getQuantity: dto.getQuantity,
        };

      case DealType.BUNDLE:
        return {
          ...baseData,
          bundlePrice: dto.bundlePrice,
        };

      case DealType.QUANTITY_DISCOUNT:
        return {
          ...baseData,
          minQuantity: dto.minQuantity,
          quantityDiscount: dto.quantityDiscount,
        };

      case DealType.VOUCHER:
        return {
          ...baseData,
          voucherValue: dto.voucherValue,
        };

      default:
        return baseData;
    }
  }

  /**
   * Checks for questionable pricing and notifies admins if detected.
   * Handles different deal types appropriately.
   * 
   * @param promotion - The created promotion with product relations
   * @param products - Product details including prices
   * @private
   */
  private checkQuestionablePricing(
    promotion: any,
    products: Array<{ id: number; price: any; storeId: number }>,
  ): void {
    try {
      // Only check for discount-based deals
      if (
        promotion.dealType === DealType.PERCENTAGE_DISCOUNT &&
        promotion.percentageOff
      ) {
        for (const pp of promotion.promotionProducts) {
          const originalPrice = Number(pp.product.price);
          const discountedPrice =
            originalPrice * (1 - promotion.percentageOff / 100);

          if (
            isQuestionablePromotionDiscount(
              promotion.percentageOff,
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
                this.logger.error(
                  'Error creating questionable pricing notification:',
                  err,
                );
              });
            break; // Only notify once per promotion
          }
        }
      } else if (
        promotion.dealType === DealType.FIXED_DISCOUNT &&
        promotion.fixedAmountOff
      ) {
        for (const pp of promotion.promotionProducts) {
          const originalPrice = Number(pp.product.price);
          const discountedPrice = originalPrice - promotion.fixedAmountOff;

          // Check if discount is greater than price or results in suspicious pricing
          if (discountedPrice <= 0 || promotion.fixedAmountOff > originalPrice) {
            this.notificationService
              .notifyAdminQuestionablePromotionPricing(
                promotion.id,
                pp.product.storeId,
              )
              .catch((err: unknown) => {
                this.logger.error(
                  'Error creating questionable pricing notification:',
                  err,
                );
              });
            break;
          }
        }
      } else if (
        promotion.dealType === DealType.BUNDLE &&
        promotion.bundlePrice
      ) {
        // Check if bundle price is suspiciously low compared to sum of products
        const totalPrice = promotion.promotionProducts.reduce(
          (sum: number, pp: any) => sum + Number(pp.product.price),
          0,
        );
        const discount = ((totalPrice - promotion.bundlePrice) / totalPrice) * 100;

        if (discount > 80 || promotion.bundlePrice <= 0) {
          const storeId = promotion.promotionProducts[0]?.product?.storeId;
          if (storeId) {
            this.notificationService
              .notifyAdminQuestionablePromotionPricing(promotion.id, storeId)
              .catch((err: unknown) => {
                this.logger.error(
                  'Error creating questionable pricing notification:',
                  err,
                );
              });
          }
        }
      } else if (
        promotion.dealType === DealType.VOUCHER &&
        promotion.voucherValue
      ) {
        // Check if voucher value is suspiciously high compared to product prices
        const totalPrice = promotion.promotionProducts.reduce(
          (sum: number, pp: any) => sum + Number(pp.product.price),
          0,
        );
        const discount = (promotion.voucherValue / totalPrice) * 100;

        if (discount > 80 || promotion.voucherValue <= 0) {
          const storeId = promotion.promotionProducts[0]?.product?.storeId;
          if (storeId) {
            this.notificationService
              .notifyAdminQuestionablePromotionPricing(promotion.id, storeId)
              .catch((err: unknown) => {
                this.logger.error(
                  'Error creating questionable pricing notification:',
                  err,
                );
              });
          }
        }
      }
    } catch (error) {
      this.logger.error('Error checking questionable pricing:', error);
    }
  }

  /**
   * Calculates the final price for a product in a promotion based on quantity.
   * 
   * @param productId - The product ID
   * @param promotionId - The promotion ID
   * @param quantity - The quantity being purchased
   * @returns Promise resolving to the calculated price
   * @throws {BadRequestException} If product or promotion not found
   * 
   * @example
   * ```typescript
   * const finalPrice = await promotionService.calculatePromotionPrice(1, 5, 3);
   * // Returns the price for 3 units of product 1 with promotion 5 applied
   * ```
   */
  async calculatePromotionPrice(
    productId: number,
    promotionId: number,
    quantity: number,
  ): Promise<number> {
    const promotion = await this.prisma.promotion.findUnique({
      where: { id: promotionId },
      include: {
        promotionProducts: {
          where: { productId },
          include: { product: true },
        },
      },
    });

    if (!promotion || promotion.promotionProducts.length === 0) {
      throw new BadRequestException(
        'Product not found in this promotion',
      );
    }

    const product = promotion.promotionProducts[0].product;
    const unitPrice = Number(product.price);

    switch (promotion.dealType) {
      case DealType.PERCENTAGE_DISCOUNT:
        return (
          unitPrice * quantity * (1 - (promotion.percentageOff || 0) / 100)
        );

      case DealType.FIXED_DISCOUNT:
        return Math.max(
          0,
          unitPrice * quantity - (promotion.fixedAmountOff || 0),
        );

      case DealType.BOGO: {
        const buyQty = promotion.buyQuantity || 1;
        const getQty = promotion.getQuantity || 1;
        const sets = Math.floor(quantity / (buyQty + getQty));
        const remainder = quantity % (buyQty + getQty);
        return unitPrice * (sets * buyQty + remainder);
      }

      case DealType.BUNDLE:
        // Bundle price is for all products together, not per product
        return promotion.bundlePrice || unitPrice * quantity;

      case DealType.QUANTITY_DISCOUNT: {
        const minQty = promotion.minQuantity || 2;
        const discount = promotion.quantityDiscount || 0;
        if (quantity >= minQty) {
          return unitPrice * quantity * (1 - discount / 100);
        }
        return unitPrice * quantity;
      }

      case DealType.VOUCHER:
        // Subtract voucher value from total price, but don't go below 0
        return Math.max(0, unitPrice * quantity - (promotion.voucherValue || 0));

      default:
        return unitPrice * quantity;
    }
  }

  /**
   * Generates a voucher redemption token for a consumer.
   * Creates a PENDING redemption record and returns a JWT token with consumer info.
   * 
   * @param userId - Consumer user ID
   * @param dto - Voucher token generation data
   * @returns Promise resolving to voucher token response
   * @throws {BadRequestException} If promotion not found, not a voucher, or already redeemed
   * 
   * @example
   * ```typescript
   * const tokenData = await promotionService.generateVoucherToken(123, {
   *   promotionId: 1,
   *   storeId: 5,
   *   productId: 10
   * });
   * ```
   */
  async generateVoucherToken(
    userId: number,
    dto: GenerateVoucherTokenDto,
  ): Promise<VoucherTokenResponseDto> {
    // Verify promotion exists and is a voucher type
    const promotion = await this.prisma.promotion.findUnique({
      where: { id: dto.promotionId },
      include: {
        promotionProducts: {
          include: {
            product: {
              select: {
                id: true,
                storeId: true,
              },
            },
          },
        },
      },
    });

    if (!promotion) {
      throw new BadRequestException('Promotion not found');
    }

    if (promotion.dealType !== DealType.VOUCHER) {
      throw new BadRequestException('This promotion is not a voucher type');
    }

    // Verify store exists and matches the promotion
    const store = await this.prisma.store.findUnique({
      where: { id: dto.storeId },
    });

    if (!store) {
      throw new BadRequestException('Store not found');
    }

    // If productId provided, verify it's in the promotion
    if (dto.productId) {
      const productInPromotion = promotion.promotionProducts.some(
        (pp) => pp.productId === dto.productId,
      );

      if (!productInPromotion) {
        throw new BadRequestException('Product not found in this promotion');
      }
    }

    // Check if user already has a redemption for this voucher at this store
    const existingRedemption = await this.prisma.voucherRedemption.findUnique({
      where: {
        userId_promotionId_storeId: {
          userId,
          promotionId: dto.promotionId,
          storeId: dto.storeId,
        },
      },
    });

    if (existingRedemption) {
      if (existingRedemption.status === VoucherRedemptionStatus.REDEEMED) {
        throw new BadRequestException('Voucher already redeemed at this store');
      }
      // If PENDING or VERIFIED, delete and create new one
      await this.prisma.voucherRedemption.delete({
        where: { id: existingRedemption.id },
      });
    }

    // Get user info
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Create voucher redemption record
    const redemption = await this.prisma.voucherRedemption.create({
      data: {
        userId,
        promotionId: dto.promotionId,
        storeId: dto.storeId,
        productId: dto.productId,
        status: VoucherRedemptionStatus.PENDING,
      },
    });

    // Generate JWT token with redemption info
    const payload = {
      redemptionId: redemption.id,
      userId: user.id,
      userName: user.name,
      promotionId: dto.promotionId,
      storeId: dto.storeId,
      productId: dto.productId,
    };

    const token = this.jwtService.sign(payload, {
      expiresIn: '1h', // Token valid for 1 hour
    });

    return {
      token,
      userId: user.id,
      userName: user.name,
      redemptionId: redemption.id,
      promotionId: dto.promotionId,
      storeId: dto.storeId,
      productId: dto.productId,
      status: VoucherRedemptionStatus.PENDING,
    };
  }

  /**
   * Verifies a voucher redemption token.
   * Validates the token and returns consumer information for retailer to review.
   * Updates redemption status to VERIFIED if valid.
   * 
   * @param token - JWT token from consumer's QR code
   * @param retailerId - Retailer user ID performing verification
   * @returns Promise resolving to verification response with consumer info
   * @throws {UnauthorizedException} If token is invalid or expired
   * @throws {BadRequestException} If redemption not found or already redeemed
   * @throws {ForbiddenException} If retailer doesn't own the store
   * 
   * @example
   * ```typescript
   * const verification = await promotionService.verifyVoucherToken(
   *   'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
   *   retailerId
   * );
   * ```
   */
  async verifyVoucherToken(
    token: string,
    retailerId: number,
  ): Promise<VoucherVerificationResponseDto> {
    try {
      // Decode and verify JWT token
      const payload = this.jwtService.verify(token);

      const {
        redemptionId,
        userId,
        userName,
        promotionId,
        storeId,
        productId,
      } = payload;

      // Verify retailer owns the store
      const store = await this.prisma.store.findFirst({
        where: {
          id: storeId,
          ownerId: retailerId,
        },
      });

      if (!store) {
        throw new ForbiddenException(
          'You do not have permission to verify vouchers for this store',
        );
      }

      // Get redemption record
      const redemption = await this.prisma.voucherRedemption.findUnique({
        where: { id: redemptionId },
      });

      if (!redemption) {
        return {
          valid: false,
          userId,
          userName,
          subscriptionTier: 'UNKNOWN',
          redemptionId,
          promotionTitle: 'Unknown',
          voucherValue: 0,
          storeId,
          productId,
          status: VoucherRedemptionStatus.CANCELLED,
          message: 'Redemption record not found',
        };
      }

      // Check if already redeemed
      if (redemption.status === VoucherRedemptionStatus.REDEEMED) {
        const promotion = await this.prisma.promotion.findUnique({
          where: { id: promotionId },
        });

        return {
          valid: false,
          userId,
          userName,
          subscriptionTier: 'UNKNOWN',
          redemptionId,
          promotionTitle: promotion?.title || 'Unknown',
          voucherValue: Number(promotion?.voucherValue || 0),
          storeId,
          productId,
          status: VoucherRedemptionStatus.REDEEMED,
          message: 'Voucher already redeemed',
        };
      }

      // Get user and promotion info
      const [user, promotion] = await Promise.all([
        this.prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            name: true,
            subscriptionTier: true,
          },
        }),
        this.prisma.promotion.findUnique({
          where: { id: promotionId },
        }),
      ]);

      if (!user || !promotion) {
        return {
          valid: false,
          userId,
          userName,
          subscriptionTier: 'UNKNOWN',
          redemptionId,
          promotionTitle: 'Unknown',
          voucherValue: 0,
          storeId,
          productId,
          status: VoucherRedemptionStatus.CANCELLED,
          message: 'User or promotion not found',
        };
      }

      // Update redemption status to VERIFIED
      await this.prisma.voucherRedemption.update({
        where: { id: redemptionId },
        data: { status: VoucherRedemptionStatus.VERIFIED },
      });

      return {
        valid: true,
        userId: user.id,
        userName: user.name,
        subscriptionTier: user.subscriptionTier,
        redemptionId,
        promotionTitle: promotion.title,
        voucherValue: Number(promotion.voucherValue || 0),
        storeId,
        productId,
        status: VoucherRedemptionStatus.VERIFIED,
      };
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid or expired voucher token');
    }
  }

  /**
   * Confirms voucher redemption by retailer.
   * Marks the voucher as REDEEMED, making it unusable for future redemptions.
   * 
   * @param token - JWT token from consumer's QR code
   * @param retailerId - Retailer user ID performing confirmation
   * @returns Promise resolving to success message
   * @throws {UnauthorizedException} If token is invalid
   * @throws {BadRequestException} If redemption not found or already redeemed
   * @throws {ForbiddenException} If retailer doesn't own the store or redemption not verified
   * 
   * @example
   * ```typescript
   * await promotionService.confirmVoucherRedemption(
   *   'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
   *   retailerId
   * );
   * ```
   */
  async confirmVoucherRedemption(
    token: string,
    retailerId: number,
  ): Promise<{ message: string; redemptionId: number }> {
    try {
      // Decode and verify JWT token
      const payload = this.jwtService.verify(token);

      const { redemptionId, storeId } = payload;

      // Verify retailer owns the store
      const store = await this.prisma.store.findFirst({
        where: {
          id: storeId,
          ownerId: retailerId,
        },
      });

      if (!store) {
        throw new ForbiddenException(
          'You do not have permission to confirm redemptions for this store',
        );
      }

      // Get redemption record
      const redemption = await this.prisma.voucherRedemption.findUnique({
        where: { id: redemptionId },
      });

      if (!redemption) {
        throw new BadRequestException('Redemption record not found');
      }

      // Check if already redeemed
      if (redemption.status === VoucherRedemptionStatus.REDEEMED) {
        throw new BadRequestException('Voucher already redeemed');
      }

      // Must be verified first
      if (redemption.status !== VoucherRedemptionStatus.VERIFIED) {
        throw new ForbiddenException(
          'Voucher must be verified before confirmation',
        );
      }

      // Update redemption status to REDEEMED
      await this.prisma.voucherRedemption.update({
        where: { id: redemptionId },
        data: {
          status: VoucherRedemptionStatus.REDEEMED,
          redeemedAt: new Date(),
        },
      });

      this.logger.log(
        `Voucher redemption ${redemptionId} confirmed by retailer ${retailerId}`,
      );

      return {
        message: 'Voucher redeemed successfully',
        redemptionId,
      };
    } catch (error) {
      if (
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new UnauthorizedException('Invalid or expired voucher token');
    }
  }

  /**
   * Gets voucher redemption status for a consumer.
   * 
   * @param userId - Consumer user ID
   * @param promotionId - Promotion ID
   * @param storeId - Store ID
   * @returns Promise resolving to redemption status or null if not found
   */
  async getVoucherRedemptionStatus(
    userId: number,
    promotionId: number,
    storeId: number,
  ) {
    return this.prisma.voucherRedemption.findUnique({
      where: {
        userId_promotionId_storeId: {
          userId,
          promotionId,
          storeId,
        },
      },
    });
  }
}
