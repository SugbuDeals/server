import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StoreResponseDto } from 'src/store/dto/store-response.dto';
import { ProductResponseDto } from 'src/product/dto/product-response.dto';

/**
 * Store Bookmark Response DTO
 * 
 * Response DTO for store bookmark data.
 * Matches the StoreBookmark model from Prisma schema.
 */
export class StoreBookmarkResponseDto {
  @ApiProperty({ example: 1, description: 'Bookmark ID' })
  id: number;

  @ApiProperty({ example: 1, description: 'User ID' })
  userId: number;

  @ApiProperty({ example: 1, description: 'Store ID' })
  storeId: number;

  @ApiProperty({ 
    example: '2024-01-01T00:00:00.000Z', 
    description: 'Bookmark creation timestamp',
    type: String,
    format: 'date-time'
  })
  createdAt: Date;

  @ApiPropertyOptional({ 
    type: StoreResponseDto, 
    description: 'Store details (when included)',
    required: false
  })
  store?: StoreResponseDto;
}

/**
 * Product Bookmark Response DTO
 * 
 * Response DTO for product bookmark data.
 * Matches the ProductBookmark model from Prisma schema.
 */
export class ProductBookmarkResponseDto {
  @ApiProperty({ example: 1, description: 'Bookmark ID' })
  id: number;

  @ApiProperty({ example: 1, description: 'User ID' })
  userId: number;

  @ApiProperty({ example: 1, description: 'Product ID' })
  productId: number;

  @ApiProperty({ 
    example: '2024-01-01T00:00:00.000Z', 
    description: 'Bookmark creation timestamp',
    type: String,
    format: 'date-time'
  })
  createdAt: Date;

  @ApiPropertyOptional({ 
    type: ProductResponseDto, 
    description: 'Product details (when included)',
    required: false
  })
  product?: ProductResponseDto;
}

