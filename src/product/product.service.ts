import { Injectable } from '@nestjs/common';
import { Prisma, Product } from 'generated/prisma';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ProductService {
  constructor(private prisma: PrismaService) {}

  /**
   * Find unique product
   */
  async product(
    productWhereUniqueInput: Prisma.ProductWhereUniqueInput,
  ): Promise<Product | null> {
    return this.prisma.product.findUnique({ where: productWhereUniqueInput });
  }

  /**
   * Find many products
   */
  async products(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.ProductWhereUniqueInput;
    where?: Prisma.ProductWhereInput;
    orderBy?: Prisma.ProductOrderByWithRelationInput;
  }): Promise<Product[]> {
    const { skip, take, cursor, where, orderBy } = params;
    return this.prisma.product.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
    });
  }

  /**
   * Create product
   */
  async createProduct(data: Prisma.ProductCreateInput): Promise<Product> {
    return this.prisma.product.create({ data });
  }

  /**
   * Delete product
   */
  async deleteProduct(where: Prisma.ProductWhereUniqueInput): Promise<Product> {
    return this.prisma.product.delete({ where });
  }
}
