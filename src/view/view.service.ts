import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { EntityType, Prisma } from 'generated/prisma';
import { RetailerAnalyticsQueryDto, TimePeriod } from './dto/retailer-analytics-query.dto';
import { RetailerAnalyticsResponseDto } from './dto/retailer-analytics-response.dto';
import { StoreResponseDto } from 'src/store/dto/store-response.dto';
import { ProductResponseDto } from 'src/product/dto/product-response.dto';

/**
 * View Service
 * 
 * Core service for managing view tracking across stores, products, and promotions.
 * Provides comprehensive view tracking operations with built-in analytics capabilities.
 * 
 * **Core Functionality:**
 * - Record user views with automatic timestamp updates
 * - Retrieve user view history with filtering and pagination
 * - Count unique views per entity for analytics
 * - Check if specific users have viewed entities
 * 
 * **Key Features:**
 * - **Unique Views:** Each user can have only one view record per entity
 * - **Timestamp Updates:** Subsequent views update the viewedAt timestamp
 * - **Type Safety:** Fully typed with TypeScript generics (no any types)
 * - **Efficient Queries:** Optimized with database indexes on common query patterns
 * 
 * **Database Schema:**
 * ```
 * View {
 *   id: Int (PK)
 *   userId: Int (FK -> User)
 *   entityType: EntityType (enum: STORE | PRODUCT | PROMOTION)
 *   entityId: Int
 *   viewedAt: DateTime (auto-updated)
 *   
 *   Unique constraint: [userId, entityType, entityId]
 *   Indexes: userId, [entityType, entityId], viewedAt
 * }
 * ```
 * 
 * **Use Cases:**
 * - Recently viewed items features
 * - User engagement analytics
 * - Personalized recommendations
 * - Popular items tracking
 * - A/B testing metrics
 * 
 * @Injectable
 * @see {@link ViewController} for the REST API endpoints
 */
@Injectable()
export class ViewService {
  /**
   * Creates a new ViewService instance
   * 
   * @param prisma - Injected PrismaService for database access
   */
  constructor(private prisma: PrismaService) {}

  /**
   * Records a user's view of an entity
   * 
   * Uses Prisma's upsert operation to intelligently handle view recording:
   * - **First view:** Creates a new view record with current timestamp
   * - **Subsequent views:** Updates the existing record's viewedAt timestamp
   * 
   * This approach ensures data integrity while maintaining accurate recency information.
   * 
   * **Performance:**
   * - Single atomic database operation (upsert)
   * - Leverages unique constraint for conflict detection
   * - Indexed query on [userId, entityType, entityId] for fast lookups
   * 
   * **Type Safety:**
   * - Generic type parameter T ensures entityType is strongly typed
   * - No any types used throughout the implementation
   * 
   * @template T - EntityType constraint for type safety
   * @param userId - ID of the authenticated user recording the view
   * @param entityType - Type of entity being viewed (STORE, PRODUCT, or PROMOTION)
   * @param entityId - Unique identifier of the entity being viewed
   * @returns Promise resolving to the view record (created or updated)
   * 
   * @throws {PrismaClientKnownRequestError} If the user or entity doesn't exist
   * 
   * @example
   * ```typescript
   * // Record a product view
   * const view = await viewService.recordView(5, EntityType.PRODUCT, 42);
   * console.log(`User 5 viewed product 42 at ${view.viewedAt}`);
   * 
   * // Record a store view
   * const storeView = await viewService.recordView(
   *   userId,
   *   EntityType.STORE,
   *   storeId
   * );
   * ```
   */
  async recordView<T extends EntityType>(
    userId: number,
    entityType: T,
    entityId: number,
  ) {
    return this.prisma.view.upsert({
      where: {
        userId_entityType_entityId: {
          userId,
          entityType,
          entityId,
        },
      },
      update: {
        viewedAt: new Date(),
      },
      create: {
        userId,
        entityType,
        entityId,
      },
    });
  }

  /**
   * Retrieves a user's view history with filtering and pagination
   * 
   * Returns all views recorded by a specific user, with options to:
   * - Filter by entity type (e.g., only show product views)
   * - Paginate results using skip/take parameters
   * - Results are always ordered by viewedAt DESC (most recent first)
   * 
   * **Query Optimization:**
   * - Uses indexed userId field for fast user lookup
   * - Conditional entityType filter added only when specified
   * - Efficient ordering using indexed viewedAt field
   * 
   * **Pagination:**
   * - skip: Number of records to skip (for page offset)
   * - take: Maximum number of records to return
   * - Combined, enables standard pagination patterns
   * 
   * @param userId - ID of the user whose view history to retrieve
   * @param entityType - Optional filter to show only specific entity type views
   * @param skip - Optional number of records to skip (default: 0)
   * @param take - Optional maximum records to return (default: unlimited)
   * @returns Promise resolving to an array of view records, newest first
   * 
   * @example
   * ```typescript
   * // Get all views for user 5
   * const allViews = await viewService.getUserViews(5);
   * 
   * // Get only product views for user 5
   * const productViews = await viewService.getUserViews(
   *   5,
   *   EntityType.PRODUCT
   * );
   * 
   * // Get product views with pagination (page 2, 20 per page)
   * const page2 = await viewService.getUserViews(
   *   5,
   *   EntityType.PRODUCT,
   *   20,  // skip first 20
   *   20   // take next 20
   * );
   * ```
   */
  async getUserViews(
    userId: number,
    entityType?: EntityType,
    skip?: number,
    take?: number,
  ) {
    const where: Prisma.ViewWhereInput = {
      userId,
      ...(entityType && { entityType }),
    };

    return this.prisma.view.findMany({
      where,
      orderBy: { viewedAt: 'desc' },
      skip,
      take,
    });
  }

  /**
   * Retrieves all views for a specific entity
   * 
   * Returns a list of all users who have viewed a particular entity,
   * ordered by most recent views first. Useful for analytics and
   * understanding user engagement with specific items.
   * 
   * **Use Cases:**
   * - See which users viewed a specific product
   * - Analyze store page visitor demographics
   * - Track promotion visibility to specific users
   * - Generate engagement reports
   * - Identify potential customers for remarketing
   * 
   * **Query Performance:**
   * - Uses composite index on [entityType, entityId] for fast lookup
   * - Ordered by indexed viewedAt field for efficiency
   * 
   * @param entityType - Type of entity to query (STORE, PRODUCT, or PROMOTION)
   * @param entityId - Unique identifier of the entity
   * @returns Promise resolving to array of view records with user information
   * 
   * @example
   * ```typescript
   * // Get all views for product 42
   * const productViews = await viewService.getEntityViews(
   *   EntityType.PRODUCT,
   *   42
   * );
   * console.log(`${productViews.length} unique users viewed this product`);
   * 
   * // Get most recent viewer
   * const latestViewer = productViews[0];
   * console.log(`Most recently viewed by user ${latestViewer.userId}`);
   * ```
   */
  async getEntityViews(entityType: EntityType, entityId: number) {
    return this.prisma.view.findMany({
      where: {
        entityType,
        entityId,
      },
      orderBy: { viewedAt: 'desc' },
    });
  }

  /**
   * Gets the total count of unique views for an entity
   * 
   * Returns the number of distinct users who have viewed the specified entity.
   * Due to the unique constraint on [userId, entityType, entityId], each user
   * can only have one view record per entity, making this a true unique user count.
   * 
   * **Key Insight:**
   * This count represents **engagement breadth** (how many users) rather than
   * engagement depth (how many total views). Multiple views by the same user
   * don't increase this count.
   * 
   * **Performance:**
   * - Optimized COUNT query using composite index
   * - Returns integer count directly from database
   * - Very fast even for entities with thousands of views
   * 
   * **Analytics Applications:**
   * - Calculate entity popularity rankings
   * - Compare view counts across similar entities
   * - Track growth in unique viewers over time
   * - Identify trending products/stores/promotions
   * - Measure marketing campaign reach
   * 
   * @param entityType - Type of entity to count views for
   * @param entityId - Unique identifier of the entity
   * @returns Promise resolving to the count of unique user views (0 or positive integer)
   * 
   * @example
   * ```typescript
   * // Get view count for a product
   * const viewCount = await viewService.getEntityViewCount(
   *   EntityType.PRODUCT,
   *   42
   * );
   * console.log(`${viewCount} unique users have viewed this product`);
   * 
   * // Compare popularity of two products
   * const [count1, count2] = await Promise.all([
   *   viewService.getEntityViewCount(EntityType.PRODUCT, 1),
   *   viewService.getEntityViewCount(EntityType.PRODUCT, 2),
   * ]);
   * console.log(`Product 1 is ${count1 > count2 ? 'more' : 'less'} popular`);
   * ```
   */
  async getEntityViewCount(
    entityType: EntityType,
    entityId: number,
  ): Promise<number> {
    return this.prisma.view.count({
      where: {
        entityType,
        entityId,
      },
    });
  }

  /**
   * Checks if a user has viewed a specific entity
   * 
   * Performs a fast lookup to determine if a view record exists for the
   * given user-entity combination. Useful for conditional UI rendering
   * (e.g., showing "You've viewed this before" badges).
   * 
   * **Performance:**
   * - Uses unique index for O(1) lookup time
   * - Returns immediately after finding the record (or null)
   * - Very lightweight operation suitable for frequent calls
   * 
   * **Use Cases:**
   * - Show "viewed" indicators in product listings
   * - Filter out previously viewed items in recommendations
   * - Track completion of browsing flows
   * - Implement "continue where you left off" features
   * 
   * @param userId - ID of the user to check
   * @param entityType - Type of entity to check
   * @param entityId - ID of the entity to check
   * @returns Promise resolving to true if viewed, false if not
   * 
   * @example
   * ```typescript
   * // Check if user has viewed a product
   * const hasViewed = await viewService.hasUserViewed(
   *   5,
   *   EntityType.PRODUCT,
   *   42
   * );
   * 
   * if (hasViewed) {
   *   console.log('User has seen this product before');
   * }
   * 
   * // Filter products to show only new ones
   * const unseenProducts = [];
   * for (const product of allProducts) {
   *   const viewed = await viewService.hasUserViewed(
   *     userId,
   *     EntityType.PRODUCT,
   *     product.id
   *   );
   *   if (!viewed) unseenProducts.push(product);
   * }
   * ```
   */
  async hasUserViewed(
    userId: number,
    entityType: EntityType,
    entityId: number,
  ): Promise<boolean> {
    const view = await this.prisma.view.findUnique({
      where: {
        userId_entityType_entityId: {
          userId,
          entityType,
          entityId,
        },
      },
    });

    return view !== null;
  }

  /**
   * Gets a user's view record for a specific entity
   * 
   * Retrieves the complete view record including the viewedAt timestamp.
   * Returns null if the user has never viewed the entity.
   * 
   * **Difference from hasUserViewed:**
   * - `hasUserViewed()` returns boolean (existence check only)
   * - `getUserEntityView()` returns full record with timestamp data
   * 
   * **Use Cases:**
   * - Check when a user last viewed an entity
   * - Display "Last viewed X days ago" messages
   * - Calculate time since last interaction
   * - Determine if view is stale and needs refreshing
   * 
   * @param userId - ID of the user whose view to retrieve
   * @param entityType - Type of entity to look up
   * @param entityId - ID of the entity to look up
   * @returns Promise resolving to the view record, or null if never viewed
   * 
   * @example
   * ```typescript
   * // Get view record with timestamp
   * const view = await viewService.getUserEntityView(
   *   5,
   *   EntityType.PRODUCT,
   *   42
   * );
   * 
   * if (view) {
   *   const daysSince = Math.floor(
   *     (Date.now() - view.viewedAt.getTime()) / (1000 * 60 * 60 * 24)
   *   );
   *   console.log(`Last viewed ${daysSince} days ago`);
   * } else {
   *   console.log('Never viewed before');
   * }
   * ```
   */
  async getUserEntityView(
    userId: number,
    entityType: EntityType,
    entityId: number,
  ) {
    return this.prisma.view.findUnique({
      where: {
        userId_entityType_entityId: {
          userId,
          entityType,
          entityId,
        },
      },
    });
  }

  /**
   * Gets comprehensive view analytics for a retailer
   * 
   * Retrieves view engagement metrics for all stores and products owned by
   * the retailer, filtered by the specified time period. Returns aggregated
   * counts and per-entity breakdowns sorted by view count.
   * 
   * **Access Control:**
   * - Only returns analytics for stores/products owned by the retailer
   * - Validates ownership at the database level
   * 
   * **Time Period Handling:**
   * - Daily: Last 24 hours from now
   * - Weekly: Last 7 days from now
   * - Monthly: Last 30 days from now
   * - Custom: Between startDate and endDate (inclusive)
   * 
   * **Entity Type Filtering:**
   * - If entityType is STORE, only returns store analytics
   * - If entityType is PRODUCT, only returns product analytics
   * - If omitted, returns both store and product analytics
   * 
   * **Performance:**
   * - Uses database indexes on viewedAt, entityType, entityId
   * - Efficient JOINs with Store and Product tables
   * - Aggregates at database level using groupBy
   * 
   * @param userId - ID of the retailer user
   * @param query - Query parameters including time period and optional entity type filter
   * @returns Promise resolving to comprehensive analytics data
   * 
   * @example
   * ```typescript
   * // Get weekly analytics for all entities
   * const analytics = await viewService.getRetailerAnalytics(userId, {
   *   timePeriod: TimePeriod.WEEKLY
   * });
   * 
   * // Get monthly product analytics only
   * const productAnalytics = await viewService.getRetailerAnalytics(userId, {
   *   timePeriod: TimePeriod.MONTHLY,
   *   entityType: EntityType.PRODUCT
   * });
   * ```
   */
  async getRetailerAnalytics(
    userId: number,
    query: RetailerAnalyticsQueryDto,
  ): Promise<RetailerAnalyticsResponseDto> {
    const { startDate, endDate } = this.calculateDateRange(query.timePeriod, query.startDate, query.endDate);

    const shouldIncludeStores = !query.entityType || query.entityType === EntityType.STORE;
    const shouldIncludeProducts = !query.entityType || query.entityType === EntityType.PRODUCT;

    const [storeViews, productViews] = await Promise.all([
      shouldIncludeStores
        ? this.getRetailerStoreViews(userId, startDate, endDate)
        : Promise.resolve([]),
      shouldIncludeProducts
        ? this.getRetailerProductViews(userId, startDate, endDate)
        : Promise.resolve([]),
    ]);

    const totalStoreViews = storeViews.reduce((sum, item) => sum + item.viewCount, 0);
    const totalProductViews = productViews.reduce((sum, item) => sum + item.viewCount, 0);

    return {
      totalStoreViews,
      totalProductViews,
      storeViews,
      productViews,
      timePeriod: query.timePeriod,
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
    };
  }

  /**
   * Calculates date range based on time period
   * 
   * Converts a time period enum and optional custom dates into a concrete
   * date range with start and end Date objects.
   * 
   * @param timePeriod - Time period enum value
   * @param startDateStr - Optional start date string (required for custom)
   * @param endDateStr - Optional end date string (required for custom)
   * @returns Object with start and end Date objects
   * @throws {BadRequestException} If custom period is missing dates, dates are invalid, or time period is unknown
   */
  private calculateDateRange(
    timePeriod: TimePeriod,
    startDateStr?: string,
    endDateStr?: string,
  ): { startDate: Date; endDate: Date } {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    switch (timePeriod) {
      case TimePeriod.DAILY:
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case TimePeriod.WEEKLY:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case TimePeriod.MONTHLY:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case TimePeriod.CUSTOM:
        if (!startDateStr || !endDateStr) {
          throw new BadRequestException(
            'startDate and endDate are required for custom time period',
          );
        }
        startDate = new Date(startDateStr);
        endDate = new Date(endDateStr);
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          throw new BadRequestException(
            'Invalid date format. Dates must be valid ISO 8601 strings',
          );
        }
        if (startDate > endDate) {
          throw new BadRequestException(
            'startDate must be before or equal to endDate',
          );
        }
        break;
      default:
        throw new BadRequestException(`Unknown time period: ${timePeriod}`);
    }

    return { startDate, endDate };
  }

  /**
   * Gets store view analytics for a retailer
   * 
   * Retrieves view counts for all stores owned by the retailer within the
   * specified date range. Returns stores sorted by view count (descending)
   * with complete store details.
   * 
   * **Ownership Validation:**
   * - Only includes stores where ownerId matches the retailer's userId
   * - Validated at database level using JOIN
   * 
   * **View Counting:**
   * - Counts unique users per store (using unique constraint)
   * - Filters by viewedAt timestamp within date range
   * - Stores with no views are excluded from results
   * 
   * @param userId - ID of the retailer user
   * @param startDate - Start date for filtering views (inclusive)
   * @param endDate - End date for filtering views (inclusive)
   * @returns Promise resolving to array of store analytics items sorted by view count
   */
  private async getRetailerStoreViews(
    userId: number,
    startDate: Date,
    endDate: Date,
  ): Promise<Array<{ store: StoreResponseDto; viewCount: number }>> {
    const storeViewCounts = await this.prisma.view.groupBy({
      by: ['entityId'],
      where: {
        entityType: EntityType.STORE,
        viewedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      _count: {
        id: true,
      },
    });

    if (storeViewCounts.length === 0) {
      return [];
    }

    const storeIds = storeViewCounts.map((item) => item.entityId);
    const stores = await this.prisma.store.findMany({
      where: {
        id: { in: storeIds },
        ownerId: userId,
      },
    });

    const storeMap = new Map(stores.map((store) => [store.id, store]));
    const viewCountMap = new Map(
      storeViewCounts.map((item) => [item.entityId, item._count.id]),
    );

    return stores
      .map((store) => ({
        store: store as StoreResponseDto,
        viewCount: viewCountMap.get(store.id) ?? 0,
      }))
      .filter((item) => item.viewCount > 0)
      .sort((a, b) => b.viewCount - a.viewCount);
  }

  /**
   * Gets product view analytics for a retailer
   * 
   * Retrieves view counts for all products from stores owned by the retailer
   * within the specified date range. Returns products sorted by view count
   * (descending) with complete product details.
   * 
   * **Ownership Validation:**
   * - Only includes products from stores where ownerId matches the retailer's userId
   * - Validated at database level using JOIN
   * 
   * **View Counting:**
   * - Counts unique users per product (using unique constraint)
   * - Filters by viewedAt timestamp within date range
   * - Products with no views are excluded from results
   * 
   * @param userId - ID of the retailer user
   * @param startDate - Start date for filtering views (inclusive)
   * @param endDate - End date for filtering views (inclusive)
   * @returns Promise resolving to array of product analytics items sorted by view count
   */
  private async getRetailerProductViews(
    userId: number,
    startDate: Date,
    endDate: Date,
  ): Promise<Array<{ product: ProductResponseDto; viewCount: number }>> {
    const productViewCounts = await this.prisma.view.groupBy({
      by: ['entityId'],
      where: {
        entityType: EntityType.PRODUCT,
        viewedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      _count: {
        id: true,
      },
    });

    if (productViewCounts.length === 0) {
      return [];
    }

    const productIds = productViewCounts.map((item) => item.entityId);
    const products = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
        store: {
          ownerId: userId,
        },
      },
    });

    const productMap = new Map(products.map((product) => [product.id, product]));
    const viewCountMap = new Map(
      productViewCounts.map((item) => [item.entityId, item._count.id]),
    );

    return products
      .map((product) => ({
        product: {
          ...product,
          price: product.price.toString(),
        } as ProductResponseDto,
        viewCount: viewCountMap.get(product.id) ?? 0,
      }))
      .filter((item) => item.viewCount > 0)
      .sort((a, b) => b.viewCount - a.viewCount);
  }
}
