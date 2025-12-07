import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

/**
 * Product Bookmark Data Transfer Object
 * 
 * DTO for bookmarking or unbookmarking a product.
 * Used in POST and DELETE requests for product bookmark operations.
 */
export class ProductBookmarkDto {
  /**
   * Product ID to bookmark or unbookmark
   * Must be a positive integer
   */
  @ApiProperty({ 
    example: 99, 
    description: 'ID of the product to bookmark/unbookmark',
    minimum: 1,
    type: Number
  })
  @IsInt()
  @Min(1)
  productId!: number;
}


