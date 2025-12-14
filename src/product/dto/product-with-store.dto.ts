import { ApiProperty } from '@nestjs/swagger';
import { ProductResponseDto } from './product-response.dto';
import { StoreResponseDto } from '../../store/dto/store-response.dto';

/**
 * Product response with store details
 * 
 * Used for products within promotion responses.
 * Includes product details and the store that owns it.
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
 *   }
 * }
 * ```
 */
export class ProductWithStoreDto extends ProductResponseDto {
  @ApiProperty({ 
    type: StoreResponseDto,
    description: 'Store that owns this product'
  })
  store: StoreResponseDto;
}
