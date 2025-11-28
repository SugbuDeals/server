import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class PromotionService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  async create(createPromotionDto: CreatePromotionDto) {
    const promotion = await this.prisma.promotion.create({
      data: createPromotionDto,
    });

    // Notify users who bookmarked the product or store
    if (promotion.productId) {
      this.notificationService
        .notifyPromotionCreated(promotion.id, promotion.productId)
        .catch((err) => {
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
