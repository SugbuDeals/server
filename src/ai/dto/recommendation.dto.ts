import { IsEnum, IsNumber, IsOptional, IsString, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Similar Products Request DTO
 * 
 * Used for requesting similar products to a given product ID.
 */
export class SimilarProductsDto {
  @ApiProperty({ 
    example: 42, 
    description: 'The ID of the product to find similar items for' 
  })
  @IsNumber()
  productId: number;

  @ApiPropertyOptional({ 
    example: 10, 
    description: 'Number of similar products to return (default: 3)' 
  })
  @IsNumber()
  @IsOptional()
  count?: number;
}

/**
 * Recommendation Type Enum
 * 
 * Defines the types of recommendations the AI agent can provide.
 */
export enum RecommendationType {
  /** Product recommendations - when user asks about products, items, or goods */
  PRODUCT = 'product',
  /** Store recommendations - when user asks about shops, sellers, or places to buy */
  STORE = 'store',
  /** Promotion recommendations - when user asks about deals, discounts, or sales */
  PROMOTION = 'promotion',
  /** General chat - when user asks conversational questions not related to recommendations */
  CHAT = 'chat',
}

/**
 * Intent Type Enum
 * 
 * Optional explicit intent specification for the AI agent.
 * If not provided, the AI will automatically detect intent from the query.
 */
export enum IntentType {
  /** Explicitly request product recommendations */
  PRODUCT = 'product',
  /** Explicitly request store recommendations */
  STORE = 'store',
  /** Explicitly request promotion recommendations */
  PROMOTION = 'promotion',
  /** Explicitly request general chat (no tool calling) */
  CHAT = 'chat',
}

/**
 * Freeform Recommendation Request DTO
 * 
 * Unified request DTO for the AI agent recommendations endpoint.
 * Supports automatic intent detection or explicit intent specification.
 * 
 * The AI agent will:
 * - Automatically detect intent (Product, Store, Promotion, or Chat) if not specified
 * - Consider both relevance to query and distance from user (when coordinates provided)
 * - Use structured tool calling following Groq best practices
 * - Return location-aware recommendations sorted by combined relevance and proximity
 * 
 * @example
 * ```json
 * {
 *   "query": "budget mechanical keyboard",
 *   "count": 5,
 *   "latitude": 10.3157,
 *   "longitude": 123.8854,
 *   "radius": 10
 * }
 * ```
 */
export class FreeformRecommendationDto {
  @ApiProperty({ 
    example: 'budget mechanical keyboard',
    description: 'Natural language query describing what the user is looking for. The AI will automatically detect intent and use appropriate tools.'
  })
  @IsString()
  query: string;

  @ApiPropertyOptional({ 
    example: 6,
    description: 'Maximum number of results to return (default: 3)'
  })
  @IsNumber()
  @IsOptional()
  count?: number;

  @ApiPropertyOptional({ 
    example: 10.3157, 
    description: 'User latitude for location-aware recommendations. Must be provided together with longitude. Range: -90 to 90.',
    minimum: -90,
    maximum: 90
  })
  @IsNumber()
  @IsOptional()
  latitude?: number;

  @ApiPropertyOptional({ 
    example: 123.8854, 
    description: 'User longitude for location-aware recommendations. Must be provided together with latitude. Range: -180 to 180.',
    minimum: -180,
    maximum: 180
  })
  @IsNumber()
  @IsOptional()
  longitude?: number;

  @ApiPropertyOptional({ 
    example: 5, 
    description: 'Search radius in kilometers for location filtering. Valid options: 5, 10, or 15. Defaults to 5km if not specified. Only used when latitude and longitude are provided.',
    enum: [5, 10, 15],
    minimum: 5,
    maximum: 15
  })
  @IsNumber()
  @IsOptional()
  @Min(5)
  @Max(15)
  radius?: number;

  @ApiPropertyOptional({
    enum: IntentType,
    example: IntentType.PRODUCT,
    description: 'Optional explicit intent specification. If not provided, the AI will automatically detect intent from the query. Use this to force a specific mode (product, store, promotion, or chat).'
  })
  @IsEnum(IntentType)
  @IsOptional()
  intent?: IntentType;
}
