import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

/**
 * Bookmark Service
 * 
 * Provides bookmark management operations for stores and products.
 * Handles creating, deleting, and listing bookmarks for authenticated users.
 * 
 * Bookmarks allow users to save stores and products for later reference.
 * Users are automatically notified when bookmarked stores add new products
 * or when bookmarked products have price/stock changes.
 */
@Injectable()
export class BookmarkService {
  constructor(private prisma: PrismaService) {}

  /**
   * Creates a bookmark for a store.
   * 
   * @param userId - ID of the user creating the bookmark
   * @param storeId - ID of the store to bookmark
   * @returns Promise resolving to the created bookmark
   * @throws {PrismaClientKnownRequestError} If bookmark already exists or store/user not found
   */
  async bookmarkStore(userId: number, storeId: number) {
    return this.prisma.storeBookmark.create({
      data: { userId, storeId },
    });
  }

  /**
   * Removes a store bookmark.
   * 
   * @param userId - ID of the user removing the bookmark
   * @param storeId - ID of the store to unbookmark
   * @returns Promise resolving to the deleted bookmark
   * @throws {PrismaClientKnownRequestError} If bookmark doesn't exist
   */
  async unbookmarkStore(userId: number, storeId: number) {
    return this.prisma.storeBookmark.delete({
      where: { userId_storeId: { userId, storeId } },
    });
  }

  /**
   * Lists all store bookmarks for a user.
   * 
   * Returns bookmarks with full store information, ordered by creation date (newest first).
   * 
   * @param userId - ID of the user whose bookmarks to retrieve
   * @returns Promise resolving to an array of store bookmarks with store details
   */
  async listStoreBookmarks(userId: number) {
    return this.prisma.storeBookmark.findMany({
      where: { userId },
      include: { store: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Creates a bookmark for a product.
   * 
   * @param userId - ID of the user creating the bookmark
   * @param productId - ID of the product to bookmark
   * @returns Promise resolving to the created bookmark
   * @throws {PrismaClientKnownRequestError} If bookmark already exists or product/user not found
   */
  async bookmarkProduct(userId: number, productId: number) {
    return this.prisma.productBookmark.create({
      data: { userId, productId },
    });
  }

  /**
   * Removes a product bookmark.
   * 
   * @param userId - ID of the user removing the bookmark
   * @param productId - ID of the product to unbookmark
   * @returns Promise resolving to the deleted bookmark
   * @throws {PrismaClientKnownRequestError} If bookmark doesn't exist
   */
  async unbookmarkProduct(userId: number, productId: number) {
    return this.prisma.productBookmark.delete({
      where: { userId_productId: { userId, productId } },
    });
  }

  /**
   * Lists all product bookmarks for a user.
   * 
   * Returns bookmarks with full product information, ordered by creation date (newest first).
   * 
   * @param userId - ID of the user whose bookmarks to retrieve
   * @returns Promise resolving to an array of product bookmarks with product details
   */
  async listProductBookmarks(userId: number) {
    return this.prisma.productBookmark.findMany({
      where: { userId },
      include: { product: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}


