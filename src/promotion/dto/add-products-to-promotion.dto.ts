import { IsArray, IsNumber, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Add Products to Promotion DTO
 * 
 * DTO for adding additional products to an existing promotion.
 * Used to update the promotion-product relationship.
 * 
 * Subscription Tier Limits (Retailers only):
 * - BASIC: Maximum 10 products per promotion (total)
 * - PRO: Unlimited products
 */
export class AddProductsToPromotionDto {
  /**
   * Product IDs to add
   * Array of product IDs to associate with the promotion
   */
  @ApiProperty({
    example: [4, 5, 6],
    description: 'Array of product IDs to add to the promotion. BASIC tier allows max 10 products total per promotion, PRO tier allows unlimited.',
    type: [Number],
    isArray: true,
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one product is required' })
  @IsNumber({}, { each: true })
  productIds: number[];
}

