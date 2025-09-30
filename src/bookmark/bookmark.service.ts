import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class BookmarkService {
  constructor(private prisma: PrismaService) {}

  async bookmarkStore(userId: number, storeId: number) {
    return this.prisma.storeBookmark.create({
      data: { userId, storeId },
    });
  }

  async unbookmarkStore(userId: number, storeId: number) {
    return this.prisma.storeBookmark.delete({
      where: { userId_storeId: { userId, storeId } },
    });
  }

  async listStoreBookmarks(userId: number) {
    return this.prisma.storeBookmark.findMany({
      where: { userId },
      include: { store: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async bookmarkProduct(userId: number, productId: number) {
    return this.prisma.productBookmark.create({
      data: { userId, productId },
    });
  }

  async unbookmarkProduct(userId: number, productId: number) {
    return this.prisma.productBookmark.delete({
      where: { userId_productId: { userId, productId } },
    });
  }

  async listProductBookmarks(userId: number) {
    return this.prisma.productBookmark.findMany({
      where: { userId },
      include: { product: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}


