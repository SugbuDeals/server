import { ApiPropertyOptional } from '@nestjs/swagger';
import { ProductResponseDto } from './product-response.dto';
import { PromotionResponseDto } from '../../promotion/dto/promotion-response.dto';

/**
 * Product response with promotions
 * 
 * Used for nested products within store responses.
 * Includes product details and associated promotions.
 */
export class ProductWithPromotionsDto extends ProductResponseDto {
  @ApiPropertyOptional({ 
    type: [PromotionResponseDto],
    description: 'Active promotions for this product'
  })
  promotions?: PromotionResponseDto[];
}
