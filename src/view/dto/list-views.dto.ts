import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { EntityType } from 'generated/prisma';
import { PaginationQueryDto } from 'src/common/dto/pagination.dto';

/**
 * List Views Data Transfer Object
 * 
 * DTO for querying a user's view history with optional filtering and pagination.
 * Extends PaginationQueryDto to inherit skip/take parameters for pagination support.
 * 
 * **Features:**
 * - Filter by entity type (optional)
 * - Pagination support via skip/take parameters
 * - Results are always ordered by most recent views first
 * 
 * **Query Parameters:**
 * - `entityType` (optional) - Filter to only show views of a specific type
 * - `skip` (optional, inherited) - Number of records to skip (for pagination)
 * - `take` (optional, inherited) - Number of records to return (max 100)
 * 
 * @example
 * ```typescript
 * // Get all views (first page, 10 items)
 * GET /views/list
 * 
 * // Get all views with pagination
 * GET /views/list?skip=0&take=20
 * 
 * // Get only product views
 * GET /views/list?entityType=PRODUCT
 * 
 * // Get product views with pagination
 * GET /views/list?entityType=PRODUCT&skip=0&take=20
 * 
 * // Get store views, skip first 10, return next 50
 * GET /views/list?entityType=STORE&skip=10&take=50
 * ```
 * 
 * **Response:**
 * Returns an array of ViewResponseDto objects ordered by viewedAt (most recent first).
 */
export class ListViewsDto extends PaginationQueryDto {
  /**
   * Optional filter by entity type
   * 
   * When specified, only returns views matching the given entity type.
   * If omitted, returns all views regardless of entity type.
   * 
   * **Use Cases:**
   * - Show user's recently viewed products only
   * - Display history of store visits
   * - Track which promotions a user has seen
   * 
   * **Valid Values:**
   * - `STORE` - Only return store views
   * - `PRODUCT` - Only return product views
   * - `PROMOTION` - Only return promotion views
   * - Omit parameter - Return all view types
   * 
   * @example EntityType.PRODUCT
   */
  @ApiPropertyOptional({
    enum: EntityType,
    example: EntityType.PRODUCT,
    description: 'Filter views by entity type. When specified, only views of the given type are returned. Omit to return all view types.',
    enumName: 'EntityType',
    required: false,
  })
  @IsOptional()
  @IsEnum(EntityType, {
    message: 'entityType must be one of: STORE, PRODUCT, PROMOTION',
  })
  entityType?: EntityType;
}
