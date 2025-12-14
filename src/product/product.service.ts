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

  /**
   * Retrieves products with store and promotion details.
   * Supports filtering by store, category, active status.
   * Implements pagination for large result sets.
   * 
   * This method provides a comprehensive view of products with optional nested
   * store and promotion data. Uses Prisma include to prevent N+1 queries and
   * supports pagination for efficient data transfer.
   * 
   * @param params - Query parameters including filters and pagination
   * @param params.where - Prisma where clause for filtering products
   * @param params.pagination - Pagination options (skip, take)
   * @param params.includeStore - Include store details in response (default: false)
   * @param params.includePromotions - Include promotions in response (default: false)
   * @param params.onlyActivePromotions - Filter to only active promotions (default: true)
   * @returns Promise resolving to paginated products with nested store and promotions
   * 
   * @example
   * ```typescript
   * // Get products with store and active promotions, paginated
   * const result = await productService.getProductsWithStoreAndPromotions({
   *   where: { storeId: 1, isActive: true },
   *   pagination: { skip: 0, take: 20 },
   *   includeStore: true,
   *   includePromotions: true,
   *   onlyActivePromotions: true
   * });
   * 
   * // Returns:
   * // {
   * //   data: [...], // Product array with store and promotions
   * //   pagination: { skip: 0, take: 20, total: 45 }
   * // }
   * ```
   */
  async getProductsWithStoreAndPromotions(params: {
    where?: Prisma.ProductWhereInput;
    pagination?: { skip?: number; take?: number };
    includeStore?: boolean;
    includePromotions?: boolean;
    onlyActivePromotions?: boolean;
  }) {
    const {
      where,
      pagination = {},
      includeStore = false,
      includePromotions = false,
      onlyActivePromotions = true
    } = params;

    const { skip = 0, take = 10 } = pagination;
    const now = new Date();

    // Build the include object dynamically
    const include: Prisma.ProductInclude = {};
    
    if (includeStore) {
      include.store = true;
    }
    
    if (includePromotions) {
      include.promotionProducts = {
        where: onlyActivePromotions ? {
          promotion: {
            active: true,
            startsAt: { lte: now },
            OR: [
              { endsAt: null },
              { endsAt: { gte: now } }
            ]
          }
        } : undefined,
        include: {
          promotion: true
        }
      };
    }

    // Get total count for pagination
    const total = await this.prisma.product.count({ where });

    // Get products with includes
    const products = await this.prisma.product.findMany({
      where,
      skip,
      take: Math.min(take, 100), // Enforce max of 100 items
      include,
      orderBy: { createdAt: 'desc' }
    });

    // Transform the response to match DTO structure
    let transformedProducts = products;
    if (includePromotions) {
      transformedProducts = products.map((product: any) => ({
        ...product,
        promotions: product.promotionProducts?.map((pp: any) => pp.promotion) || [],
        promotionProducts: undefined
      }));
      // Clean up intermediate data
      transformedProducts.forEach((p: any) => delete p.promotionProducts);
    }

    return {
      data: transformedProducts,
      pagination: {
        skip,
        take: Math.min(take, 100),
        total
      }
    };
  }

  /**
   * Retrieves a single product with full details.
   * 
   * Provides complete product information including optional store details
   * and active promotions. Uses Prisma include to prevent N+1 queries.
   * 
   * @param productId - Product ID to retrieve
   * @param options - Optional includes
   * @param options.includeStore - Include store details in response (default: false)
   * @param options.includePromotions - Include promotions in response (default: false)
   * @param options.onlyActivePromotions - Filter to only active promotions (default: true)
   * @returns Promise resolving to product with store and promotions or null if not found
   * 
   * @example
   * ```typescript
   * // Get product with store and active promotions
   * const product = await productService.getProductWithStoreAndPromotions(1, {
   *   includeStore: true,
   *   includePromotions: true,
   *   onlyActivePromotions: true
   * });
   * 
   * // Get product with store only
   * const productBasic = await productService.getProductWithStoreAndPromotions(1, {
   *   includeStore: true,
   *   includePromotions: false
   * });
   * ```
   */
  async getProductWithStoreAndPromotions(
    productId: number,
    options?: {
      includeStore?: boolean;
      includePromotions?: boolean;
      onlyActivePromotions?: boolean;
    }
  ) {
    const includeStore = options?.includeStore || false;
    const includePromotions = options?.includePromotions || false;
    const onlyActivePromotions = options?.onlyActivePromotions !== false;

    const now = new Date();

    // Build the include object dynamically
    const include: Prisma.ProductInclude = {};
    
    if (includeStore) {
      include.store = true;
    }
    
    if (includePromotions) {
      include.promotionProducts = {
        where: onlyActivePromotions ? {
          promotion: {
            active: true,
            startsAt: { lte: now },
            OR: [
              { endsAt: null },
              { endsAt: { gte: now } }
            ]
          }
        } : undefined,
        include: {
          promotion: true
        }
      };
    }

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include
    });

    if (!product) {
      return null;
    }

    // Transform the response to match DTO structure
    if (includePromotions && 'promotionProducts' in product) {
      const transformedProduct: any = {
        ...product,
        promotions: product.promotionProducts?.map((pp: any) => pp.promotion) || [],
        promotionProducts: undefined
      };
      delete transformedProduct.promotionProducts;
      return transformedProduct;
    }

    return product;
  }
}
