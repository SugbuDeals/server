import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma, Product } from 'generated/prisma';
import { NotificationService } from 'src/notification/notification.service';
import {
  isQuestionableProductPrice,
} from 'src/notification/utils/pricing-validation.util';

@Injectable()
export class ProductService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  async products(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.ProductWhereUniqueInput;
    where?: Prisma.ProductWhereInput;
    orderBy?: Prisma.ProductOrderByWithRelationInput;
    include?: Prisma.ProductInclude;
  }): Promise<any[]> {
    const { skip, take, cursor, where, orderBy, include } = params;
    return this.prisma.product.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
      include,
    });
  }

  async product(productWhereUniqueInput: Prisma.ProductWhereUniqueInput): Promise<Product | null> {
    return this.prisma.product.findUnique({
      where: productWhereUniqueInput,
    });
  }

  async createProduct(data: Prisma.ProductCreateInput): Promise<Product> {
    const product = await this.prisma.product.create({
      data,
    });

    const productPrice = Number(product.price);

    // Check for questionable pricing and notify admin
    if (isQuestionableProductPrice(productPrice)) {
      this.notificationService
        .notifyAdminQuestionableProductPricing(product.id, product.storeId)
        .catch((err: unknown) => {
          console.error('Error creating questionable pricing notification:', err);
        });
    }

    // Notify users who bookmarked the store
    if (product.storeId) {
      this.notificationService
        .notifyProductCreated(product.id, product.storeId)
        .catch((err: unknown) => {
          console.error('Error creating product notification:', err);
        });
    }

    return product;
  }

  async updateProduct(params: {
    where: Prisma.ProductWhereUniqueInput;
    data: Prisma.ProductUpdateInput;
  }): Promise<Product> {
    const { where, data } = params;
    return this.prisma.product.update({
      data,
      where,
    });
  }

  async deleteProduct(where: Prisma.ProductWhereUniqueInput): Promise<Product> {
    return this.prisma.product.delete({
      where,
    });
  }
}
