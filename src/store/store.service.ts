import { Injectable } from '@nestjs/common';
import { Prisma, Store } from 'generated/prisma';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class StoreService {
  constructor(private prisma: PrismaService) {}

  async store(
    storeWhereUniqueInput: Prisma.StoreWhereUniqueInput,
  ): Promise<Store | null> {
    return this.prisma.store.findUnique({ where: storeWhereUniqueInput });
  }
}
