import { ApiPropertyOptional } from '@nestjs/swagger';
import { ProductResponseDto } from './product-response.dto';
import { StoreResponseDto } from '../../store/dto/store-response.dto';
import { PromotionResponseDto } from '../../promotion/dto/promotion-response.dto';

/**
 * Product response with store details and active promotions
 * 
 * Used for product listing and detail pages.
 * Provides complete product information including the owning store
 * and all active promotions applicable to this product.
 * 
 * @example
 * ```json
 * {
 *   "id": 1,
 *   "name": "iPhone 15",
 *   "price": "999.99",
 *   "store": {
 *     "id": 1,
 *     "name": "Electronics Store",
 *     "verificationStatus": "VERIFIED"
 *   },
 *   "promotions": [
 *     {
 *       "id": 1,
 *       "title": "Black Friday Sale",
 *       "dealType": "PERCENTAGE_DISCOUNT",
 *       "percentageOff": 20
 *     }
 *   ]
 * }
 * ```
 */
export class ProductWithStorePromotionsDto extends ProductResponseDto {
  @ApiPropertyOptional({ 
    type: StoreResponseDto,
    description: 'Store that owns this product'
  })
  store?: StoreResponseDto;

  @ApiPropertyOptional({ 
    type: [PromotionResponseDto],
    description: 'Active promotions for this product'
  })
  promotions?: PromotionResponseDto[];
}
