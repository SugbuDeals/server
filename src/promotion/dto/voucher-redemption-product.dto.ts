import { IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for a product selected during voucher redemption
 */
export class VoucherRedemptionProductDto {
  @ApiProperty({
    description: 'Product ID to redeem with the voucher',
    example: 1,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  productId: number;

  @ApiProperty({
    description: 'Quantity of this product to redeem',
    example: 2,
    minimum: 1,
    default: 1,
  })
  @IsInt()
  @Min(1)
  quantity: number;
}

