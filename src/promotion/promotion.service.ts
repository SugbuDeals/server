import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { NotificationService } from '../notification/notification.service';
import {
  isQuestionablePromotionDiscount,
} from 'src/notification/utils/pricing-validation.util';

@Injectable()
export class PromotionService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

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

  findAll() {
    return this.prisma.promotion.findMany();
  }

  findOne(id: number) {
    return this.prisma.promotion.findUnique({
      where: { id },
    });
  }

  update(id: number, updatePromotionDto: UpdatePromotionDto) {
    return this.prisma.promotion.update({
      where: { id },
      data: updatePromotionDto
    });
  }

  remove(id: number) {
    return this.prisma.promotion.delete({
      where: { id },
    });
  }

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
