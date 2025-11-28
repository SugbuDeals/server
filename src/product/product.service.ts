import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma, Product } from 'generated/prisma';
import { NotificationService } from 'src/notification/notification.service';

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

    // Notify users who bookmarked the store
    if (product.storeId) {
      this.notificationService
        .notifyProductCreated(product.id, product.storeId)
        .catch((err) => {
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

    // Get old product values to detect changes
    const oldProduct = await this.prisma.product.findUnique({
      where,
    });

    const updatedProduct = await this.prisma.product.update({
      data,
      where,
    });

    // Notify about price changes
    if (oldProduct && data.price !== undefined) {
      const oldPrice = Number(oldProduct.price);
      const newPrice = Number(updatedProduct.price);
      if (oldPrice !== newPrice) {
        this.notificationService
          .notifyProductPriceChanged(updatedProduct.id, oldPrice, newPrice)
          .catch((err) => {
            console.error('Error creating price change notification:', err);
          });
      }
    }

    // Notify about stock changes
    if (oldProduct && data.stock !== undefined) {
      const oldStock = oldProduct.stock;
      const newStock = updatedProduct.stock;
      if (oldStock !== newStock) {
        this.notificationService
          .notifyProductStockChanged(updatedProduct.id, oldStock, newStock)
          .catch((err) => {
            console.error('Error creating stock change notification:', err);
          });
      }
    }

    return updatedProduct;
  }

  async deleteProduct(where: Prisma.ProductWhereUniqueInput): Promise<Product> {
    return this.prisma.product.delete({
      where,
    });
  }
}
