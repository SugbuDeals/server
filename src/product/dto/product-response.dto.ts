import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Product Response DTO
 * 
 * Response DTO for product data.
 * Matches the Product model from Prisma schema.
 */
export class ProductResponseDto {
  @ApiProperty({ example: 1, description: 'Product ID' })
  id: number;

  @ApiProperty({ example: 'Apple iPhone 15', description: 'Product name' })
  name: string;

  @ApiProperty({ example: 'Newest model with A17 chip', description: 'Product description' })
  description: string;

  @ApiProperty({ example: '599.99', description: 'Product price (Decimal as string)', type: String })
  price: string;

  @ApiProperty({ example: 100, description: 'Units in stock' })
  stock: number;

  @ApiProperty({ 
    example: '2024-01-01T00:00:00.000Z', 
    description: 'Product creation timestamp',
    type: String,
    format: 'date-time'
  })
  createdAt: Date;

  @ApiProperty({ example: true, description: 'Whether product is active' })
  isActive: boolean;

  @ApiProperty({ example: 1, description: 'Store ID that owns this product' })
  storeId: number;

  @ApiPropertyOptional({ 
    example: 5, 
    description: 'Category ID (nullable)',
    nullable: true
  })
  categoryId: number | null;

  @ApiPropertyOptional({ 
    example: 'http://localhost:3000/files/image.jpg', 
    description: 'Product image URL',
    nullable: true
  })
  imageUrl: string | null;
}

