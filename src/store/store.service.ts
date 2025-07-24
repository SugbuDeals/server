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

  /**
   * Create store
   */
  async createStore(data: Prisma.StoreCreateInput): Promise<Store> {
    return this.prisma.store.create({ data });
  }

  /**
   * Update store
   */
  async updateStore(params: {
    where: Prisma.StoreWhereUniqueInput;
    data: Prisma.StoreUpdateInput;
  }): Promise<Store> {
    const { data, where } = params;
    return this.prisma.store.update({ where, data });
  }

  /**
   * Delete store
   */
  async deleteStore(where: Prisma.StoreWhereUniqueInput): Promise<Store> {
    return this.prisma.store.delete({ where });
  }
}
