import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { NotificationService } from '../notification/notification.service';
import {
  isQuestionablePromotionDiscount,
} from 'src/notification/utils/pricing-validation.util';

/**
 * Promotion Service
 * 
 * Provides promotion data access and manipulation operations.
 * Handles CRUD operations for product promotions and deals.
 * 
 * Features:
 * - Automatic notification triggers for promotion creation
 * - Questionable discount detection and admin alerts
 * - Active promotion filtering based on date ranges
 * - Bookmark notifications when promotions are created
 */
@Injectable()
export class PromotionService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  /**
   * Creates a new promotion.
   * 
   * After creation, automatically:
   * - Checks for questionable discount pricing and notifies admins if detected
   * - Notifies users who bookmarked the product or store about the new promotion
   * 
   * @param createPromotionDto - The data for creating the promotion
   * @returns Promise resolving to the newly created promotion (with product relation)
   * @throws {PrismaClientKnownRequestError} If promotion creation fails
   */
  async create(createPromotionDto: CreatePromotionDto) {
    const promotion = await this.prisma.promotion.create({
      data: createPromotionDto,
      include: { product: true },
    });

    // Check for questionable pricing and notify admin
    let originalPrice: number | undefined;
    if (promotion.product) {
      originalPrice = Number(promotion.product.price);
      if (originalPrice !== undefined) {
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
              promotion.product.storeId,
            )
            .catch((err: unknown) => {
              console.error(
                'Error creating questionable pricing notification:',
                err,
              );
            });
        }
      }
    }

    // Notify users who bookmarked the product or store
    if (promotion.productId) {
      this.notificationService
        .notifyPromotionCreated(promotion.id, promotion.productId)
        .catch((err: unknown) => {
          console.error('Error creating promotion notification:', err);
        });
    }

    return promotion;
  }

  /**
   * Retrieves all promotions from the database.
   * 
   * @returns Promise resolving to an array of all promotions
   */
  findAll() {
    return this.prisma.promotion.findMany();
  }

  /**
   * Retrieves a single promotion by its ID.
   * 
   * @param id - Promotion ID
   * @returns Promise resolving to the found promotion or null if not found
   */
  findOne(id: number) {
    return this.prisma.promotion.findUnique({
      where: { id },
    });
  }

  /**
   * Updates an existing promotion in the database.
   * 
   * @param id - Promotion ID to update
   * @param updatePromotionDto - The data to update the promotion with
   * @returns Promise resolving to the updated promotion
   * @throws {PrismaClientKnownRequestError} If the promotion is not found
   */
  update(id: number, updatePromotionDto: UpdatePromotionDto) {
    return this.prisma.promotion.update({
      where: { id },
      data: updatePromotionDto
    });
  }

  /**
   * Deletes a promotion from the database.
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
   * @returns Promise resolving to an array of active promotions
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
      }
    });
  }
}
