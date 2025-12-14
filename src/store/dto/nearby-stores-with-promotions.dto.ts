import { ApiProperty } from '@nestjs/swagger';
import { StoreWithDistanceResponseDto } from './store-response.dto';
import { PromotionWithProductsStoresDto } from '../../promotion/dto/promotion-with-products-stores.dto';

/**
 * Response for location-based discovery
 * 
 * Combines nearby stores with their active promotions.
 * Used for location-based promotion discovery, helping users
 * find deals near their current location.
 * 
 * @example
 * ```json
 * {
 *   "stores": [
 *     {
 *       "id": 1,
 *       "name": "Electronics Store",
 *       "distance": 2.5,
 *       "latitude": 10.3157,
 *       "longitude": 123.8854
 *     }
 *   ],
 *   "promotions": [
 *     {
 *       "id": 1,
 *       "title": "Black Friday Sale",
 *       "dealType": "PERCENTAGE_DISCOUNT",
 *       "percentageOff": 20,
 *       "products": [...]
 *     }
 *   ],
 *   "searchParams": {
 *     "latitude": 10.3157,
 *     "longitude": 123.8854,
 *     "radiusKm": 5
 *   }
 * }
 * ```
 */
export class NearbyStoresWithPromotionsDto {
  @ApiProperty({ 
    type: [StoreWithDistanceResponseDto],
    description: 'Stores within search radius, sorted by distance'
  })
  stores: StoreWithDistanceResponseDto[];

  @ApiProperty({ 
    type: [PromotionWithProductsStoresDto],
    description: 'Active promotions at nearby stores'
  })
  promotions: PromotionWithProductsStoresDto[];

  @ApiProperty({ 
    example: { latitude: 10.3157, longitude: 123.8854, radiusKm: 5 },
    description: 'Search parameters used for this query'
  })
  searchParams: {
    latitude: number;
    longitude: number;
    radiusKm: number;
  };
}
