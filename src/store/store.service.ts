import { Injectable, Logger } from '@nestjs/common';
import { Prisma, Store } from 'generated/prisma';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotificationService } from 'src/notification/notification.service';

/**
 * Service responsible for handling store-related operations.
 * Provides methods to query and retrieve store data from the database.
 */
@Injectable()
export class StoreService {
  private readonly logger = new Logger(StoreService.name);

  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  /**
   * Retrieves a single store by its unique identifier.
   * @param params.where - Unique identifier criteria to find the store
   * @returns Promise resolving to the found store or null if not found
   */
  async store(params: {
    where: Prisma.StoreWhereUniqueInput;
  }): Promise<Store | null> {
    const { where } = params;
    return this.prisma.store.findUnique({ where });
  }

  /**
   * Retrieves multiple stores based on provided criteria.
   * @param params - Query parameters for finding stores
   * @param params.skip - Number of records to skip
   * @param params.take - Number of records to take
   * @param params.cursor - Cursor for pagination
   * @param params.where - Filter conditions
   * @param params.orderBy - Sorting criteria
   * @returns Promise resolving to an array of stores
   */
  async stores(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.StoreWhereUniqueInput;
    where?: Prisma.StoreWhereInput;
    orderBy?: Prisma.StoreOrderByWithRelationInput;
  }): Promise<Store[]> {
    const { skip, take, cursor, where, orderBy } = params;
    return this.prisma.store.findMany({ skip, take, cursor, where, orderBy });
  }

  /**
   * Finds stores within a specified radius of given coordinates.
   * 
   * Uses the Haversine formula to calculate the great-circle distance between
   * the search point and each store's location. Returns stores sorted by distance
   * (closest first), up to a maximum of 50 results.
   * 
   * The Haversine formula calculates distances on a sphere (Earth) and is accurate
   * for most use cases. Distance is returned in kilometers.
   * 
   * By default, only returns verified and active stores. Use the optional filters
   * to customize this behavior.
   * 
   * @param latitude - Latitude of the search center point (in decimal degrees, -90 to 90)
   * @param longitude - Longitude of the search center point (in decimal degrees, -180 to 180)
   * @param radiusKm - Search radius in kilometers (default: 10km)
   * @param options - Optional filters for verification status and active status
   * @param options.onlyVerified - If true, only returns verified stores (default: true)
   * @param options.onlyActive - If true, only returns active stores (default: true)
   * @returns Promise resolving to an array of stores with a calculated 'distance' field (in km)
   * 
   * @example
   * ```typescript
   * // Find verified stores within 5km of Cebu City
   * const stores = await storeService.findNearby(10.3157, 123.8854, 5);
   * // Returns: [{ id: 1, name: 'Store A', distance: 2.5, ... }, ...]
   * ```
   */
  async findNearby(
    latitude: number,
    longitude: number,
    radiusKm: number = 10,
    options?: { onlyVerified?: boolean; onlyActive?: boolean },
  ) {
    const onlyVerified = options?.onlyVerified !== false; // Default to true
    const onlyActive = options?.onlyActive !== false; // Default to true

    // Haversine formula approximation for nearby stores
    // Always filter by verified and active stores by default for security and data quality
    const stores = await this.prisma.$queryRaw<Array<Store & { distance: number }>>`
      SELECT * FROM (
        SELECT *, 
          ( 6371 * acos( cos( radians(${latitude}) ) 
          * cos( radians( latitude ) ) 
          * cos( radians( longitude ) - radians(${longitude}) ) 
          + sin( radians(${latitude}) ) 
          * sin( radians( latitude ) ) ) ) AS distance 
        FROM "Store" 
        WHERE latitude IS NOT NULL 
          AND longitude IS NOT NULL
          ${onlyVerified ? Prisma.sql`AND "verificationStatus" = 'VERIFIED'` : Prisma.empty}
          ${onlyActive ? Prisma.sql`AND "isActive" = true` : Prisma.empty}
      ) AS stores_with_distance
      WHERE distance < ${radiusKm}
      ORDER BY distance
      LIMIT 50
    `;

    return stores;
  }

  /**
   * Creates a new store in the database.
   * 
   * After creating the store, automatically sends notifications:
   * - To the retailer: Store is under review
   * - To all admins: New store created and awaiting approval
   * 
   * @param params.data - The data for creating the store
   * @returns Promise resolving to the newly created store
   * @throws {PrismaClientKnownRequestError} If store creation fails (e.g., duplicate owner)
   */
  async create(params: { data: Prisma.StoreCreateInput }): Promise<Store> {
    const { data } = params;
    const store = await this.prisma.store.create({ data });

    this.logger.log(`Store created - Store ID: ${store.id}, Name: ${store.name}, Owner ID: ${store.ownerId}`);

    // Notify retailer that store is under review
    this.notificationService
      .notifyStoreUnderReview(store.id)
      .catch((err: unknown) => {
        this.logger.error(`Error creating store review notification for store ${store.id}:`, err);
      });

    // Notify all admins that a store was created
    this.notificationService
      .notifyAdminStoreCreated(store.id)
      .catch((err: unknown) => {
        this.logger.error(`Error creating admin store notification for store ${store.id}:`, err);
      });

    return store;
  }

  /**
   * Updates an existing store in the database.
   * @param params.where - Unique identifier of the store to update
   * @param params.data - The data to update the store with
   * @returns Promise resolving to the updated store
   * @throws {PrismaClientKnownRequestError} If the store is not found
   */
  async update(params: {
    where: Prisma.StoreWhereUniqueInput;
    data: Prisma.StoreUpdateInput;
    include?: Prisma.StoreInclude;
  }): Promise<Store> {
    const { where, data, include } = params;
    return this.prisma.store.update({ where, data, include });
  }

  /**
   * Deletes a store from the database.
   * @param params.where - Unique identifier of the store to delete
   * @returns Promise resolving to the deleted store
   * @throws {PrismaClientKnownRequestError} If the store is not found
   */
  async delete(params: {
    where: Prisma.StoreWhereUniqueInput;
  }): Promise<Store> {
    const { where } = params;
    return this.prisma.store.delete({ where });
  }

  /**
   * Retrieves a store with its products and their active promotions.
   * Uses Prisma include to prevent N+1 queries.
   * 
   * This method provides a comprehensive view of a store, including all its products
   * and optionally their associated promotions. Perfect for store detail pages.
   * 
   * @param storeId - Store ID to retrieve
   * @param options - Optional configuration for includes
   * @param options.includeProducts - Include products array in response (default: true)
   * @param options.includePromotions - Include promotions for each product (default: false)
   * @param options.onlyActivePromotions - Filter to only active promotions (default: true)
   * @returns Promise resolving to store with nested data or null if not found
   * 
   * @example
   * ```typescript
   * // Get store with products and active promotions
   * const store = await storeService.getStoreWithProductsAndPromotions(1, {
   *   includeProducts: true,
   *   includePromotions: true,
   *   onlyActivePromotions: true
   * });
   * 
   * // Get store with products only (no promotions)
   * const storeBasic = await storeService.getStoreWithProductsAndPromotions(1, {
   *   includeProducts: true,
   *   includePromotions: false
   * });
   * ```
   */
  async getStoreWithProductsAndPromotions(
    storeId: number,
    options?: {
      includeProducts?: boolean;
      includePromotions?: boolean;
      onlyActivePromotions?: boolean;
    }
  ) {
    const includeProducts = options?.includeProducts !== false;
    const includePromotions = options?.includePromotions || false;
    const onlyActivePromotions = options?.onlyActivePromotions !== false;

    const now = new Date();
    
    // Build the include object dynamically
    const include: Prisma.StoreInclude = {};
    
    if (includeProducts) {
      include.products = includePromotions ? {
        include: {
          promotionProducts: {
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
          }
        }
      } : true;
    }

    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      include
    });

    if (!store) {
      return null;
    }

    // Transform the response to match DTO structure
    // Always transform when products are included to clean up promotionProducts field
    if (includeProducts && 'products' in store) {
      const transformedStore: any = {
        ...store,
        products: store.products.map((product: any) => {
          const transformed: any = { ...product };
          
          // If promotions were included, transform promotionProducts to promotions
          if (includePromotions && product.promotionProducts) {
            transformed.promotions = product.promotionProducts.map((pp: any) => pp.promotion);
          }
          
          // Always remove promotionProducts from the response
          delete transformed.promotionProducts;
          
          return transformed;
        })
      };
      
      return transformedStore;
    }

    return store;
  }

  /**
   * Finds nearby stores with active promotions.
   * Combines location search with promotion filtering.
   * 
   * This method is ideal for location-based promotion discovery, allowing users
   * to find deals near their current location. Uses Haversine formula for distance
   * calculation and efficiently filters active promotions.
   * 
   * @param latitude - Search latitude (decimal degrees, -90 to 90)
   * @param longitude - Search longitude (decimal degrees, -180 to 180)
   * @param radiusKm - Search radius in kilometers
   * @param options - Filters for stores and promotions
   * @param options.onlyVerified - Only return verified stores (default: true)
   * @param options.onlyActive - Only return active stores (default: true)
   * @param options.onlyActivePromotions - Only return active promotions (default: true)
   * @returns Promise resolving to nearby stores and their promotions
   * 
   * @example
   * ```typescript
   * // Find verified stores with active promotions within 5km
   * const result = await storeService.findNearbyWithPromotions(
   *   10.3157,
   *   123.8854,
   *   5,
   *   {
   *     onlyVerified: true,
   *     onlyActive: true,
   *     onlyActivePromotions: true
   *   }
   * );
   * 
   * // Returns:
   * // {
   * //   stores: [...], // Nearby stores with distance
   * //   promotions: [...], // Active promotions at these stores
   * //   searchParams: { latitude, longitude, radiusKm }
   * // }
   * ```
   */
  async findNearbyWithPromotions(
    latitude: number,
    longitude: number,
    radiusKm: number,
    options?: {
      onlyVerified?: boolean;
      onlyActive?: boolean;
      onlyActivePromotions?: boolean;
    }
  ) {
    const onlyVerified = options?.onlyVerified !== false;
    const onlyActive = options?.onlyActive !== false;
    const onlyActivePromotions = options?.onlyActivePromotions !== false;

    // Get nearby stores
    const stores = await this.findNearby(latitude, longitude, radiusKm, {
      onlyVerified,
      onlyActive
    });

    const storeIds = stores.map(s => s.id);

    if (storeIds.length === 0) {
      return {
        stores: [],
        promotions: [],
        searchParams: { latitude, longitude, radiusKm }
      };
    }

    // Build promotion filter
    const now = new Date();
    const promotionWhere: Prisma.PromotionWhereInput = {
      promotionProducts: {
        some: {
          product: {
            storeId: { in: storeIds }
          }
        }
      }
    };

    if (onlyActivePromotions) {
      promotionWhere.active = true;
      promotionWhere.startsAt = { lte: now };
      promotionWhere.OR = [
        { endsAt: null },
        { endsAt: { gte: now } }
      ];
    }

    // Get promotions at these stores with product and store details
    const promotions = await this.prisma.promotion.findMany({
      where: promotionWhere,
      include: {
        promotionProducts: {
          where: {
            product: {
              storeId: { in: storeIds }
            }
          },
          include: {
            product: {
              include: {
                store: true
              }
            }
          }
        }
      }
    });

    // Transform promotions to match DTO structure
    const transformedPromotions = promotions.map(promo => ({
      ...promo,
      products: promo.promotionProducts.map(pp => pp.product),
      promotionProducts: undefined
    }));

    // Clean up intermediate data
    transformedPromotions.forEach(p => delete (p as any).promotionProducts);

    return {
      stores,
      promotions: transformedPromotions,
      searchParams: { latitude, longitude, radiusKm }
    };
  }
}
