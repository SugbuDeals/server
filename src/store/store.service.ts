import { Injectable } from '@nestjs/common';
import { Prisma, Store } from 'generated/prisma';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class StoreService {
  constructor(private prisma: PrismaService) {}

  /**
   * Find unique store
   */
  async store(
    storeWhereUniqueInput: Prisma.StoreWhereUniqueInput,
  ): Promise<Store | null> {
    return this.prisma.store.findUnique({
      where: storeWhereUniqueInput,
    });
  }

  /**
   * Find many stores
   */
  async stores(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.StoreWhereUniqueInput;
    where?: Prisma.StoreWhereInput;
    orderBy?: Prisma.StoreOrderByWithRelationInput;
  }): Promise<Store[]> {
    const { skip, take, cursor, where, orderBy } = params;
    return this.prisma.store.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
    });
  }
}
