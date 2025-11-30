import { Injectable } from '@nestjs/common';
import { Prisma, Store } from 'generated/prisma';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotificationService } from 'src/notification/notification.service';

/**
 * Service responsible for handling store-related operations.
 * Provides methods to query and retrieve store data from the database.
 */
@Injectable()
export class StoreService {
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

  async findNearby(
  latitude: number,
  longitude: number,
  radiusKm: number = 10,
) {
  // Haversine formula approximation for nearby stores
  const stores = await this.prisma.$queryRaw`
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
    ) AS stores_with_distance
    WHERE distance < ${radiusKm}
    ORDER BY distance
    LIMIT 50
  `;

  return stores;
}

  /**
   * Creates a new store in the database.
   * @param params.data - The data for creating the store
   * @returns Promise resolving to the newly created store
   */
  async create(params: { data: Prisma.StoreCreateInput }): Promise<Store> {
    const { data } = params;
    const store = await this.prisma.store.create({ data });

    // Notify retailer that store is under review
    this.notificationService
      .notifyStoreUnderReview(store.id)
      .catch((err: unknown) => {
        console.error('Error creating store review notification:', err);
      });

    // Notify all admins that a store was created
    this.notificationService
      .notifyAdminStoreCreated(store.id)
      .catch((err: unknown) => {
        console.error('Error creating admin store notification:', err);
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
