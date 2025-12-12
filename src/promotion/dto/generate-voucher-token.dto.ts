import { IsInt, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for generating a voucher redemption token
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

  @ApiPropertyOptional({
    description: 'Optional specific product ID for redemption',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  productId?: number;
}

