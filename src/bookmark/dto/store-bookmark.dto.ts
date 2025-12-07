import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

/**
 * Store Bookmark Data Transfer Object
 * 
 * DTO for bookmarking or unbookmarking a store.
 * Used in POST and DELETE requests for store bookmark operations.
 */
export class StoreBookmarkDto {
  /**
   * Store ID to bookmark or unbookmark
   * Must be a positive integer
   */
  @ApiProperty({ 
    example: 42, 
    description: 'ID of the store to bookmark/unbookmark',
    minimum: 1,
    type: Number
  })
  @IsInt()
  @Min(1)
  storeId!: number;
}

/**
 * List Bookmarks Data Transfer Object
 * 
 * DTO for pagination parameters when listing bookmarks.
 * Currently used for API consistency, though pagination is not yet implemented.
 */
export class ListBookmarksDto {
  /**
   * Number of results to return
   * Optional - for future pagination implementation
   */
  @ApiProperty({ 
    example: 10, 
    required: false, 
    description: 'Number of results to return (for future pagination)',
    minimum: 0,
    type: Number
  })
  @IsInt()
  @Min(0)
  take?: number;

  /**
   * Number of results to skip
   * Optional - for future pagination implementation
   */
  @ApiProperty({ 
    example: 0, 
    required: false, 
    description: 'Number of results to skip (for future pagination)',
    minimum: 0,
    type: Number
  })
  @IsInt()
  @Min(0)
  skip?: number;
}


