import { IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for generating a voucher redemption token.
 * 
 * Note: The consumer must select which product from the promotion they want to use the voucher for.
 * A voucher promotion can have multiple products, but each voucher redemption can only be used for one product.
 */
export class GenerateVoucherTokenDto {
  @ApiProperty({
    description: 'Promotion ID for the voucher',
    example: 1,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  promotionId: number;

  @ApiProperty({
    description: 'Store ID where the voucher will be redeemed',
    example: 1,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  storeId: number;

  @ApiProperty({
    description: 'Product ID from the promotion that the consumer wants to use the voucher for. Consumer must select one product from the promotion\'s products.',
    example: 1,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  productId: number;
}






