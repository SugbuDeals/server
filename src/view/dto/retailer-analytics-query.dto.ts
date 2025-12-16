import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsOptional,
  IsDateString,
  ValidateIf,
  IsIn,
} from 'class-validator';
import { EntityType } from 'generated/prisma';

/**
 * Time Period Enum
 * 
 * Defines the available time periods for filtering retailer analytics.
 * 
 * **Values:**
 * - `daily` - Views from the last 24 hours
 * - `weekly` - Views from the last 7 days
 * - `monthly` - Views from the last 30 days
 * - `custom` - Views between custom startDate and endDate (inclusive)
 */
export enum TimePeriod {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  CUSTOM = 'custom',
}

/**
 * Retailer Analytics Query Data Transfer Object
 * 
 * DTO for querying retailer view analytics with time period filtering.
 * Allows retailers to analyze engagement metrics for their stores and products
 * over different time periods.
 * 
 * **Time Periods:**
 * - **Daily**: Views from last 24 hours (from now)
 * - **Weekly**: Views from last 7 days (from now)
 * - **Monthly**: Views from last 30 days (from now)
 * - **Custom**: Views between `startDate` and `endDate` (inclusive)
 * 
 * **Entity Type Filtering:**
 * - Optional filter to show only STORE or PRODUCT views
 * - If omitted, returns analytics for both stores and products
 * 
 * **Date Format:**
 * - Dates must be in ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)
 * - Example: "2024-01-15T00:00:00.000Z"
 * 
 * @example
 * ```typescript
 * // Get daily analytics for all entities
 * GET /views/analytics/retailer?timePeriod=daily
 * 
 * // Get weekly analytics for products only
 * GET /views/analytics/retailer?timePeriod=weekly&entityType=PRODUCT
 * 
 * // Get monthly analytics for stores only
 * GET /views/analytics/retailer?timePeriod=monthly&entityType=STORE
 * 
 * // Get custom date range analytics
 * GET /views/analytics/retailer?timePeriod=custom&startDate=2024-01-01T00:00:00.000Z&endDate=2024-01-31T23:59:59.999Z
 * ```
 */
export class RetailerAnalyticsQueryDto {
  /**
   * Time period for filtering analytics
   * 
   * Determines the date range for view analytics:
   * - `daily`: Last 24 hours
   * - `weekly`: Last 7 days
   * - `monthly`: Last 30 days
   * - `custom`: Requires startDate and endDate
   * 
   * @example TimePeriod.WEEKLY
   */
  @ApiProperty({
    enum: TimePeriod,
    example: TimePeriod.WEEKLY,
    description:
      'Time period for filtering analytics. ' +
      'daily = last 24 hours, weekly = last 7 days, monthly = last 30 days, custom = requires startDate and endDate',
    enumName: 'TimePeriod',
    required: true,
  })
  @IsEnum(TimePeriod, {
    message: 'timePeriod must be one of: daily, weekly, monthly, custom',
  })
  timePeriod!: TimePeriod;

  /**
   * Start date for custom time period
   * 
   * Required when timePeriod is 'custom'. Must be in ISO 8601 format.
   * Inclusive - views on this exact date/time are included.
   * 
   * @example "2024-01-01T00:00:00.000Z"
   */
  @ApiPropertyOptional({
    example: '2024-01-01T00:00:00.000Z',
    description:
      'Start date for custom time period (ISO 8601 format). Required when timePeriod is "custom". Inclusive.',
    type: String,
    format: 'date-time',
    required: false,
  })
  @ValidateIf((o) => o.timePeriod === TimePeriod.CUSTOM)
  @IsDateString(
    {},
    {
      message: 'startDate must be a valid ISO 8601 date string',
    },
  )
  startDate?: string;

  /**
   * End date for custom time period
   * 
   * Required when timePeriod is 'custom'. Must be in ISO 8601 format.
   * Inclusive - views on this exact date/time are included.
   * Must be after or equal to startDate.
   * 
   * @example "2024-01-31T23:59:59.999Z"
   */
  @ApiPropertyOptional({
    example: '2024-01-31T23:59:59.999Z',
    description:
      'End date for custom time period (ISO 8601 format). Required when timePeriod is "custom". Inclusive. Must be >= startDate.',
    type: String,
    format: 'date-time',
    required: false,
  })
  @ValidateIf((o) => o.timePeriod === TimePeriod.CUSTOM)
  @IsDateString(
    {},
    {
      message: 'endDate must be a valid ISO 8601 date string',
    },
  )
  endDate?: string;

  /**
   * Optional filter by entity type
   * 
   * When specified, only returns analytics for the given entity type.
   * If omitted, returns analytics for both stores and products.
   * 
   * **Valid Values:**
   * - `STORE` - Only return store view analytics
   * - `PRODUCT` - Only return product view analytics
   * 
   * @example EntityType.PRODUCT
   */
  @ApiPropertyOptional({
    enum: EntityType,
    example: EntityType.PRODUCT,
    description:
      'Optional filter by entity type. When specified, only returns analytics for stores or products. ' +
      'If omitted, returns analytics for both. Only STORE and PRODUCT are valid (PROMOTION not supported for retailer analytics).',
    enumName: 'EntityType',
    required: false,
  })
  @IsOptional()
  @IsEnum(EntityType, {
    message: 'entityType must be one of: STORE, PRODUCT',
  })
  @IsIn([EntityType.STORE, EntityType.PRODUCT], {
    message: 'entityType must be STORE or PRODUCT for retailer analytics',
  })
  entityType?: EntityType;
}
