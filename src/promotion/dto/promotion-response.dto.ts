import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DealType } from 'generated/prisma';

/**
 * Promotion Response DTO
 * 
 * Response DTO for promotion data with support for multiple deal types.
 * Different fields are populated based on the dealType.
 */
export class PromotionResponseDto {
  /**
   * Promotion ID
   */
  @ApiProperty({ example: 1, description: 'Promotion ID' })
  id: number;

  /**
   * Promotion title
   */
  @ApiProperty({ example: 'Summer Sale', description: 'Promotion title' })
  title: string;

  /**
   * Deal type
   * Determines which deal-specific fields are populated
   */
  @ApiProperty({
    enum: DealType,
    example: DealType.PERCENTAGE_DISCOUNT,
    description:
      'Type of deal: PERCENTAGE_DISCOUNT, FIXED_DISCOUNT, BOGO, BUNDLE, QUANTITY_DISCOUNT, or VOUCHER',
  })
  dealType: DealType;

  /**
   * Promotion description
   */
  @ApiProperty({
    example: 'Get 20% off on all products',
    description: 'Promotion description',
  })
  description: string;

  /**
   * Promotion start timestamp
   */
  @ApiProperty({
    example: '2024-01-01T00:00:00.000Z',
    description: 'Promotion start timestamp',
    type: String,
    format: 'date-time',
  })
  startsAt: Date;

  /**
   * Promotion end timestamp
   */
  @ApiPropertyOptional({
    example: '2024-01-31T23:59:59.000Z',
    description: 'Promotion end timestamp',
    type: String,
    format: 'date-time',
    nullable: true,
  })
  endsAt: Date | null;

  /**
   * Whether promotion is active
   */
  @ApiProperty({ example: true, description: 'Whether promotion is active' })
  active: boolean;

  // ============================================
  // Deal-specific fields
  // ============================================

  /**
   * Percentage off (PERCENTAGE_DISCOUNT only)
   * Only populated when dealType is PERCENTAGE_DISCOUNT
   */
  @ApiPropertyOptional({
    example: 25,
    description:
      'Percentage discount (0-100). Only populated for PERCENTAGE_DISCOUNT deals.',
    type: Number,
    nullable: true,
  })
  percentageOff?: number | null;

  /**
   * Fixed amount off (FIXED_DISCOUNT only)
   * Only populated when dealType is FIXED_DISCOUNT
   */
  @ApiPropertyOptional({
    example: 10,
    description:
      'Fixed amount discount. Only populated for FIXED_DISCOUNT deals.',
    type: Number,
    nullable: true,
  })
  fixedAmountOff?: number | null;

  /**
   * Buy quantity (BOGO only)
   * Only populated when dealType is BOGO
   */
  @ApiPropertyOptional({
    example: 1,
    description:
      'Number of items to buy (BOGO deals only). E.g., 1 for "Buy 1 Get 1".',
    type: Number,
    nullable: true,
  })
  buyQuantity?: number | null;

  /**
   * Get quantity (BOGO only)
   * Only populated when dealType is BOGO
   */
  @ApiPropertyOptional({
    example: 1,
    description:
      'Number of items to get free (BOGO deals only). E.g., 1 for "Buy 1 Get 1".',
    type: Number,
    nullable: true,
  })
  getQuantity?: number | null;

  /**
   * Bundle price (BUNDLE only)
   * Only populated when dealType is BUNDLE
   */
  @ApiPropertyOptional({
    example: 50,
    description: 'Fixed price for entire bundle. Only populated for BUNDLE deals.',
    type: Number,
    nullable: true,
  })
  bundlePrice?: number | null;

  /**
   * Minimum quantity (QUANTITY_DISCOUNT only)
   * Only populated when dealType is QUANTITY_DISCOUNT
   */
  @ApiPropertyOptional({
    example: 3,
    description:
      'Minimum quantity to qualify for discount. Only populated for QUANTITY_DISCOUNT deals.',
    type: Number,
    nullable: true,
  })
  minQuantity?: number | null;

  /**
   * Quantity discount (QUANTITY_DISCOUNT only)
   * Only populated when dealType is QUANTITY_DISCOUNT
   */
  @ApiPropertyOptional({
    example: 20,
    description:
      'Percentage discount when minimum quantity is met (0-100). Only populated for QUANTITY_DISCOUNT deals.',
    type: Number,
    nullable: true,
  })
  quantityDiscount?: number | null;

  /**
   * Voucher value (VOUCHER only)
   * Only populated when dealType is VOUCHER
   */
  @ApiPropertyOptional({
    example: 50,
    description:
      'Fixed monetary value like a gift card. Only populated for VOUCHER deals.',
    type: Number,
    nullable: true,
  })
  voucherValue?: number | null;
}

