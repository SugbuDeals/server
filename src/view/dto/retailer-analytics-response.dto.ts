import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EntityType } from 'generated/prisma';
import { TimePeriod } from './retailer-analytics-query.dto';
import { StoreResponseDto } from 'src/store/dto/store-response.dto';
import { ProductResponseDto } from 'src/product/dto/product-response.dto';

/**
 * Store View Analytics Item
 * 
 * Represents view analytics for a single store owned by the retailer.
 * Includes the store details and its view count within the specified time period.
 */
class StoreViewAnalyticsItem {
  /**
   * Store details
   * 
   * Complete store information including name, description, location, etc.
   */
  @ApiProperty({
    type: StoreResponseDto,
    description: 'Store details including ID, name, description, and location information',
  })
  store!: StoreResponseDto;

  /**
   * View count for this store
   * 
   * Number of unique users who viewed this store within the specified time period.
   * Each user is counted only once regardless of how many times they viewed it.
   * 
   * @example 42
   */
  @ApiProperty({
    example: 42,
    description:
      'Number of unique users who viewed this store within the specified time period. ' +
      'Each user is counted only once.',
    type: Number,
    minimum: 0,
  })
  viewCount!: number;
}

/**
 * Product View Analytics Item
 * 
 * Represents view analytics for a single product owned by the retailer.
 * Includes the product details and its view count within the specified time period.
 */
class ProductViewAnalyticsItem {
  /**
   * Product details
   * 
   * Complete product information including name, price, stock, etc.
   */
  @ApiProperty({
    type: ProductResponseDto,
    description: 'Product details including ID, name, price, stock, and image URL',
  })
  product!: ProductResponseDto;

  /**
   * View count for this product
   * 
   * Number of unique users who viewed this product within the specified time period.
   * Each user is counted only once regardless of how many times they viewed it.
   * 
   * @example 156
   */
  @ApiProperty({
    example: 156,
    description:
      'Number of unique users who viewed this product within the specified time period. ' +
      'Each user is counted only once.',
    type: Number,
    minimum: 0,
  })
  viewCount!: number;
}

/**
 * Date Range DTO
 * 
 * Represents the start and end dates for the analytics period.
 * Used to clearly communicate the exact time range analyzed.
 */
class DateRangeDto {
  /**
   * Start date of the analytics period
   * 
   * ISO 8601 formatted date string representing the beginning of the analytics period.
   * Inclusive - views on this exact date/time are included.
   * 
   * @example "2024-01-01T00:00:00.000Z"
   */
  @ApiProperty({
    example: '2024-01-01T00:00:00.000Z',
    description:
      'ISO 8601 formatted start date of the analytics period. Inclusive.',
    type: String,
    format: 'date-time',
  })
  start!: string;

  /**
   * End date of the analytics period
   * 
   * ISO 8601 formatted date string representing the end of the analytics period.
   * Inclusive - views on this exact date/time are included.
   * 
   * @example "2024-01-31T23:59:59.999Z"
   */
  @ApiProperty({
    example: '2024-01-31T23:59:59.999Z',
    description:
      'ISO 8601 formatted end date of the analytics period. Inclusive.',
    type: String,
    format: 'date-time',
  })
  end!: string;
}

/**
 * Retailer Analytics Response Data Transfer Object
 * 
 * Comprehensive analytics response for retailers showing view engagement metrics
 * for their stores and products over a specified time period.
 * 
 * **Metrics Included:**
 * - Total view counts across all stores and products
 * - Per-store view breakdowns with store details
 * - Per-product view breakdowns with product details
 * - Time period and date range information
 * 
 * **View Count Interpretation:**
 * - Counts represent unique users, not total view events
 * - Same user viewing multiple times counts as 1
 * - Counts are filtered by the specified time period
 * - Results are sorted by view count (descending)
 * 
 * **Use Cases:**
 * - Retailer dashboard analytics
 * - Identify most popular products/stores
 * - Track engagement trends over time
 * - Make data-driven inventory decisions
 * - Measure marketing campaign effectiveness
 * 
 * @example
 * ```json
 * {
 *   "totalStoreViews": 150,
 *   "totalProductViews": 450,
 *   "storeViews": [
 *     {
 *       "store": { "id": 1, "name": "Electronics Store", ... },
 *       "viewCount": 75
 *     },
 *     {
 *       "store": { "id": 2, "name": "Fashion Store", ... },
 *       "viewCount": 75
 *     }
 *   ],
 *   "productViews": [
 *     {
 *       "product": { "id": 10, "name": "iPhone 15", ... },
 *       "viewCount": 200
 *     },
 *     {
 *       "product": { "id": 11, "name": "Samsung Galaxy", ... },
 *       "viewCount": 250
 *     }
 *   ],
 *   "timePeriod": "weekly",
 *   "dateRange": {
 *     "start": "2024-01-15T00:00:00.000Z",
 *     "end": "2024-01-22T23:59:59.999Z"
 *   }
 * }
 * ```
 */
export class RetailerAnalyticsResponseDto {
  /**
   * Total unique store views
   * 
   * Sum of all unique user views across all stores owned by the retailer
   * within the specified time period. Each user viewing multiple stores
   * is counted once per store.
   * 
   * @example 150
   */
  @ApiProperty({
    example: 150,
    description:
      'Total number of unique user views across all stores owned by the retailer ' +
      'within the specified time period. Each user is counted once per store.',
    type: Number,
    minimum: 0,
  })
  totalStoreViews!: number;

  /**
   * Total unique product views
   * 
   * Sum of all unique user views across all products owned by the retailer
   * within the specified time period. Each user viewing multiple products
   * is counted once per product.
   * 
   * @example 450
   */
  @ApiProperty({
    example: 450,
    description:
      'Total number of unique user views across all products owned by the retailer ' +
      'within the specified time period. Each user is counted once per product.',
    type: Number,
    minimum: 0,
  })
  totalProductViews!: number;

  /**
   * Store view breakdown
   * 
   * Array of stores with their individual view counts, sorted by view count
   * (descending). Only includes stores owned by the retailer.
   * 
   * **Empty Array:**
   * - If retailer has no stores
   * - If entityType filter is set to PRODUCT
   * - If no views occurred in the time period
   */
  @ApiProperty({
    type: [StoreViewAnalyticsItem],
    description:
      'Array of stores with their view counts, sorted by view count (descending). ' +
      'Only includes stores owned by the retailer.',
    isArray: true,
  })
  storeViews!: StoreViewAnalyticsItem[];

  /**
   * Product view breakdown
   * 
   * Array of products with their individual view counts, sorted by view count
   * (descending). Only includes products from stores owned by the retailer.
   * 
   * **Empty Array:**
   * - If retailer has no products
   * - If entityType filter is set to STORE
   * - If no views occurred in the time period
   */
  @ApiProperty({
    type: [ProductViewAnalyticsItem],
    description:
      'Array of products with their view counts, sorted by view count (descending). ' +
      'Only includes products from stores owned by the retailer.',
    isArray: true,
  })
  productViews!: ProductViewAnalyticsItem[];

  /**
   * Time period used for filtering
   * 
   * The time period enum value that was used to filter the analytics.
   * Echoes back the request parameter for confirmation.
   * 
   * @example TimePeriod.WEEKLY
   */
  @ApiProperty({
    enum: TimePeriod,
    example: TimePeriod.WEEKLY,
    description:
      'Time period enum value used for filtering analytics. ' +
      'Echoes back the request parameter.',
    enumName: 'TimePeriod',
  })
  timePeriod!: TimePeriod;

  /**
   * Date range for the analytics period
   * 
   * Exact start and end dates (ISO 8601 format) that were used to filter views.
   * Useful for displaying the exact time range analyzed in the UI.
   * 
   * **Note:** For daily/weekly/monthly periods, dates are calculated from the
   * current time. For custom periods, dates match the request parameters.
   */
  @ApiProperty({
    type: DateRangeDto,
    description:
      'Exact date range (start and end) used for filtering views. ' +
      'ISO 8601 format. For daily/weekly/monthly, calculated from current time. ' +
      'For custom, matches request parameters.',
  })
  dateRange!: DateRangeDto;
}
