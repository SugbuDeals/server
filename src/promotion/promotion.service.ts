import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';

@Injectable()
export class PromotionService {
  constructor(private prisma: PrismaService) {}

  create(createPromotionDto: CreatePromotionDto) {
    return this.prisma.promotion.create({
      data: createPromotionDto,
    });
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
