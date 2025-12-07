import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma, Product } from 'generated/prisma';
import { NotificationService } from 'src/notification/notification.service';
import {
  isQuestionableProductPrice,
} from 'src/notification/utils/pricing-validation.util';

/**
 * Product Service
 * 
 * Provides product data access and manipulation operations.
 * Handles CRUD operations for products including creation, updates, and deletions.
 * 
 * Features:
 * - Automatic notification triggers for product creation
 * - Questionable pricing detection and admin alerts
 * - Store bookmark notifications when new products are added
 */
@Injectable()
export class ProductService {
  private readonly logger = new Logger(ProductService.name);

  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  /**
   * Retrieves multiple products based on provided criteria.
   * 
   * Supports pagination, filtering, sorting, and including related data (store, category).
   * 
   * @param params - Query parameters for finding products
   * @param params.skip - Number of records to skip for pagination
   * @param params.take - Number of records to return
   * @param params.cursor - Cursor for cursor-based pagination
   * @param params.where - Filter conditions (e.g., storeId, isActive)
   * @param params.orderBy - Sorting criteria
   * @param params.include - Related data to include (store, category)
   * @returns Promise resolving to an array of products (with included relations if specified)
   */
  async products(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.ProductWhereUniqueInput;
    where?: Prisma.ProductWhereInput;
    orderBy?: Prisma.ProductOrderByWithRelationInput;
    include?: Prisma.ProductInclude;
  }): Promise<Product[]> {
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

  /**
   * Retrieves a single product by its unique identifier.
   * 
   * @param productWhereUniqueInput - Unique identifier criteria (id)
   * @returns Promise resolving to the found product or null if not found
   */
  async product(productWhereUniqueInput: Prisma.ProductWhereUniqueInput): Promise<Product | null> {
    return this.prisma.product.findUnique({
      where: productWhereUniqueInput,
    });
  }

  /**
   * Creates a new product in the database.
   * 
   * After creation, automatically:
   * - Checks for questionable pricing and notifies admins if detected
   * - Notifies users who bookmarked the store about the new product
   * 
   * @param data - The data for creating the product
   * @returns Promise resolving to the newly created product
   * @throws {PrismaClientKnownRequestError} If product creation fails
   */
  async createProduct(data: Prisma.ProductCreateInput): Promise<Product> {
    const product = await this.prisma.product.create({
      data,
    });

    const productPrice = Number(product.price);
    this.logger.log(`Product created - Product ID: ${product.id}, Name: ${product.name}, Price: ${productPrice}, Store ID: ${product.storeId}`);

    // Check for questionable pricing and notify admin
    if (isQuestionableProductPrice(productPrice)) {
      this.logger.warn(`Questionable product price detected - Product ID: ${product.id}, Price: ${productPrice}`);
      this.notificationService
        .notifyAdminQuestionableProductPricing(product.id, product.storeId)
        .catch((err: unknown) => {
          this.logger.error(`Error creating questionable pricing notification for product ${product.id}:`, err);
        });
    }

    // Notify users who bookmarked the store
    if (product.storeId) {
      this.notificationService
        .notifyProductCreated(product.id, product.storeId)
        .catch((err: unknown) => {
          this.logger.error(`Error creating product notification for product ${product.id}:`, err);
        });
    }

    return product;
  }

  /**
   * Updates an existing product in the database.
   * 
   * @param params - Update parameters
   * @param params.where - Unique identifier of the product to update
   * @param params.data - The data to update the product with
   * @returns Promise resolving to the updated product
   * @throws {PrismaClientKnownRequestError} If the product is not found
   */
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

  /**
   * Deletes a product from the database.
   * 
   * @param where - Unique identifier of the product to delete
   * @returns Promise resolving to the deleted product
   * @throws {PrismaClientKnownRequestError} If the product is not found
   */
  async deleteProduct(where: Prisma.ProductWhereUniqueInput): Promise<Product> {
    return this.prisma.product.delete({
      where,
    });
  }
}
