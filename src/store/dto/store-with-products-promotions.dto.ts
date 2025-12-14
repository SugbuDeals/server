import { ApiPropertyOptional } from '@nestjs/swagger';
import { StoreResponseDto } from './store-response.dto';
import { ProductWithPromotionsDto } from '../../product/dto/product-with-promotions.dto';

/**
 * Store response with nested products and their promotions
 * 
 * Used for store detail pages showing all offerings.
 * Provides a complete view of a store including all its products
 * and any active promotions on those products.
 * 
 * @example
 * ```json
 * {
 *   "id": 1,
 *   "name": "Electronics Store",
 *   "products": [
 *     {
 *       "id": 1,
 *       "name": "iPhone 15",
 *       "price": "999.99",
 *       "promotions": [
 *         {
 *           "id": 1,
 *           "title": "Black Friday Sale",
 *           "dealType": "PERCENTAGE_DISCOUNT",
 *           "percentageOff": 20
 *         }
 *       ]
 *     }
 *   ]
 * }
 * ```
 */
export class StoreWithProductsPromotionsDto extends StoreResponseDto {
  @ApiPropertyOptional({ 
    type: [ProductWithPromotionsDto],
    description: 'Products belonging to this store with their active promotions'
  })
  products?: ProductWithPromotionsDto[];
}
