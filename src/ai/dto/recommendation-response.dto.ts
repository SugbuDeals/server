import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RecommendationType } from './recommendation.dto';

/**
 * Product Recommendation Item DTO
 * 
 * Represents a single product recommendation with distance information.
 */
export class ProductRecommendationItemDto {
  @ApiProperty({ example: 1, description: 'Product ID' })
  id: number;

  @ApiProperty({ example: 'Apple iPhone 15', description: 'Product name' })
  name: string;

  @ApiProperty({ example: 'Newest model with A17 chip', description: 'Product description' })
  description: string;

  @ApiProperty({ example: '599.99', description: 'Product price (Decimal as string)', type: String })
  price: string;

  @ApiPropertyOptional({ 
    example: 'http://localhost:3000/files/image.jpg', 
    description: 'Product image URL',
    nullable: true
  })
  imageUrl: string | null;

  @ApiProperty({ example: 1, description: 'Store ID that owns this product' })
  storeId: number;

  @ApiPropertyOptional({ 
    example: 'Electronics Store', 
    description: 'Store name',
    nullable: true
  })
  storeName: string | null;

  @ApiPropertyOptional({ 
    example: 2.5, 
    description: 'Distance from user location in kilometers',
    nullable: true,
    type: Number
  })
  distance: number | null;
}

/**
 * Store Recommendation Item DTO
 * 
 * Represents a single store recommendation with distance information.
 */
export class StoreRecommendationItemDto {
  @ApiProperty({ example: 1, description: 'Store ID' })
  id: number;

  @ApiProperty({ example: 'Electronics Store', description: 'Store name' })
  name: string;

  @ApiProperty({ example: 'Best electronics in town', description: 'Store description' })
  description: string;

  @ApiPropertyOptional({ 
    example: 'http://localhost:3000/files/image.jpg', 
    description: 'Store image URL',
    nullable: true
  })
  imageUrl: string | null;

  @ApiPropertyOptional({ 
    example: 10.3157, 
    description: 'Store latitude',
    nullable: true
  })
  latitude: number | null;

  @ApiPropertyOptional({ 
    example: 123.8854, 
    description: 'Store longitude',
    nullable: true
  })
  longitude: number | null;

  @ApiPropertyOptional({ 
    example: '123 Main St', 
    description: 'Store address',
    nullable: true
  })
  address: string | null;

  @ApiPropertyOptional({ 
    example: 'Cebu City', 
    description: 'Store city',
    nullable: true
  })
  city: string | null;

  @ApiPropertyOptional({ 
    example: 2.5, 
    description: 'Distance from user location in kilometers',
    nullable: true,
    type: Number
  })
  distance: number | null;
}

/**
 * Promotion Recommendation Item DTO
 * 
 * Represents a single promotion recommendation.
 */
export class PromotionRecommendationItemDto {
  @ApiProperty({ example: 1, description: 'Promotion ID' })
  id: number;

  @ApiProperty({ example: 'Summer Sale', description: 'Promotion title' })
  title: string;

  @ApiProperty({ example: 'PERCENTAGE', description: 'Promotion type' })
  type: string;

  @ApiProperty({ example: 'Get 20% off on all products', description: 'Promotion description' })
  description: string;

  @ApiProperty({ 
    example: '2024-01-01T00:00:00.000Z', 
    description: 'Promotion start timestamp',
    type: String,
    format: 'date-time'
  })
  startsAt: Date;

  @ApiPropertyOptional({ 
    example: '2024-01-31T23:59:59.000Z', 
    description: 'Promotion end timestamp',
    type: String,
    format: 'date-time',
    nullable: true
  })
  endsAt: Date | null;

  @ApiProperty({ example: 20.0, description: 'Discount amount', type: Number })
  discount: number;

  @ApiPropertyOptional({ 
    example: 1, 
    description: 'Product ID (nullable)',
    nullable: true
  })
  productId: number | null;
}

/**
 * Unified Recommendation Response DTO
 * 
 * Standard response format for all recommendation types.
 * Contains the AI-generated recommendation text, structured data, and intent.
 */
export class RecommendationResponseDto {
  @ApiProperty({ 
    example: 'Based on your preferences, I recommend the Apple iPhone 15 for its advanced features and performance. Price: ₱599.99. As a similar alternative, consider the Samsung Galaxy S24, Price: ₱549.99 (excellent camera quality).',
    description: 'AI-generated recommendation text explaining the recommendations'
  })
  recommendation: string;

  @ApiProperty({ 
    enum: RecommendationType,
    example: RecommendationType.PRODUCT,
    description: 'The detected intent of the user query'
  })
  intent: RecommendationType;

  @ApiPropertyOptional({
    type: [ProductRecommendationItemDto],
    description: 'Product recommendations (populated when intent is PRODUCT)',
    required: false
  })
  products?: ProductRecommendationItemDto[];

  @ApiPropertyOptional({
    type: [StoreRecommendationItemDto],
    description: 'Store recommendations (populated when intent is STORE)',
    required: false
  })
  stores?: StoreRecommendationItemDto[];

  @ApiPropertyOptional({
    type: [PromotionRecommendationItemDto],
    description: 'Promotion recommendations (populated when intent is PROMOTION)',
    required: false
  })
  promotions?: PromotionRecommendationItemDto[];
}

