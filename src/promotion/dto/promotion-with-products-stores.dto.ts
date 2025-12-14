import { ApiProperty } from '@nestjs/swagger';
import { PromotionResponseDto } from './promotion-response.dto';
import { ProductWithStoreDto } from '../../product/dto/product-with-store.dto';

/**
 * Promotion response with products and their store details
 * 
 * Used for promotion discovery and deal browsing.
 * Provides complete promotion information including all products
 * in the promotion and their associated stores.
 * 
 * @example
 * ```json
 * {
 *   "id": 1,
 *   "title": "Black Friday Sale",
 *   "dealType": "PERCENTAGE_DISCOUNT",
 *   "percentageOff": 20,
 *   "products": [
 *     {
 *       "id": 1,
 *       "name": "iPhone 15",
 *       "price": "999.99",
 *       "store": {
 *         "id": 1,
 *         "name": "Electronics Store",
 *         "verificationStatus": "VERIFIED"
 *       }
 *     }
 *   ]
 * }
 * ```
 */
export class PromotionWithProductsStoresDto extends PromotionResponseDto {
  @ApiProperty({ 
    type: [ProductWithStoreDto],
    description: 'Products included in this promotion with their store details'
  })
  products: ProductWithStoreDto[];
}
