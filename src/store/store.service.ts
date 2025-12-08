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
}
