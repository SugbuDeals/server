import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RecommendationType } from './recommendation.dto';
import { ProductRecommendationItemDto, StoreRecommendationItemDto, PromotionRecommendationItemDto } from './recommendation-response.dto';

/**
 * Chat Response DTO
 * 
 * Unified response DTO for the AI chatbot endpoint. Supports both conversational
 * responses and structured recommendations (products, stores, promotions).
 * 
 * The response structure varies based on the chatbot's detected intent:
 * - CHAT: Contains only `content` (conversational response)
 * - PRODUCT: Contains `content` and `products` array
 * - STORE: Contains `content` and `stores` array
 * - PROMOTION: Contains `content` and `promotions` array
 * 
 * @example Conversational Response
 * ```json
 * {
 *   "content": "Hello! How can I help you today?",
 *   "intent": "chat"
 * }
 * ```
 * 
 * @example Product Recommendation Response
 * ```json
 * {
 *   "content": "I found 3 products that match your search. Check out the recommendations below!",
 *   "intent": "product",
 *   "products": [...]
 * }
 * ```
 */
export class ChatResponseDto {
  @ApiProperty({ 
    example: 'Hello! How can I help you today?', 
    description: 'The message content from the AI assistant. For recommendations, this explains the recommendations. For chat, this is the conversational response.'
  })
  content: string;

  @ApiPropertyOptional({ 
    enum: RecommendationType,
    example: RecommendationType.CHAT,
    description: 'The detected intent of the user query. Can be: product, store, promotion, or chat.'
  })
  intent?: RecommendationType;

  @ApiPropertyOptional({
    type: [ProductRecommendationItemDto],
    description: 'Product recommendations (populated when intent is PRODUCT). Results are sorted by combined relevance and distance score. Only includes products from verified stores.',
    required: false
  })
  products?: ProductRecommendationItemDto[];

  @ApiPropertyOptional({
    type: [StoreRecommendationItemDto],
    description: 'Store recommendations (populated when intent is STORE). Results are sorted by combined relevance and distance score. Only includes verified stores.',
    required: false
  })
  stores?: StoreRecommendationItemDto[];

  @ApiPropertyOptional({
    type: [PromotionRecommendationItemDto],
    description: 'Promotion recommendations (populated when intent is PROMOTION). Results are sorted by combined relevance and distance score. Only includes promotions from verified stores.',
    required: false
  })
  promotions?: PromotionRecommendationItemDto[];
}

