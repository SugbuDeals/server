import {
  IsString,
  IsNumber,
  IsOptional,
  IsDateString,
  IsBoolean,
  IsArray,
  ArrayMinSize,
  IsEnum,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DealType } from 'generated/prisma';
import { IsDealConfigValid } from '../validators/deal-config.validator';

/**
 * Create Promotion Data Transfer Object
 * 
 * DTO for creating new product promotions with multiple deal types.
 * Supports: percentage discounts, fixed discounts, BOGO deals, bundles, and quantity-based discounts.
 * 
 * Deal-specific fields are validated based on the dealType using a custom validator.
 */
export class CreatePromotionDto {
  /**
   * Promotion title
   * A short, descriptive name for the promotion
   */
  @ApiProperty({
    example: 'Holiday Sale',
    description: 'Promotion title',
  })
  @IsString()
  title: string;

  /**
   * Deal type
   * Specifies the type of deal being created
   */
  @ApiProperty({
    enum: DealType,
    example: DealType.PERCENTAGE_DISCOUNT,
    description:
      'Type of deal: PERCENTAGE_DISCOUNT, FIXED_DISCOUNT, BOGO, BUNDLE, or QUANTITY_DISCOUNT',
  })
  @IsEnum(DealType, { message: 'Invalid deal type' })
  @IsDealConfigValid()
  dealType: DealType;

  /**
   * Promotion description
   * Detailed description of the promotion and its terms
   */
  @ApiProperty({
    example: 'Up to 30% off select items',
    description: 'Detailed description of the promotion',
  })
  @IsString()
  description: string;

  /**
   * Promotion start date
   * When the promotion becomes active (defaults to now if not provided)
   */
  @ApiPropertyOptional({
    example: '2025-12-01T00:00:00.000Z',
    description:
      'Promotion start date and time (ISO 8601 format). Defaults to current time if not provided.',
    format: 'date-time',
  })
  @IsDateString()
  @IsOptional()
  startsAt?: Date;

  /**
   * Promotion end date
   * When the promotion expires (optional - promotion can be ongoing)
   */
  @ApiPropertyOptional({
    example: '2026-01-01T00:00:00.000Z',
    description:
      'Promotion end date and time (ISO 8601 format). If not provided, promotion has no end date.',
    format: 'date-time',
  })
  @IsDateString()
  @IsOptional()
  endsAt?: Date;

  /**
   * Active status
   * Whether the promotion is currently active (defaults to true)
   */
  @ApiPropertyOptional({
    example: true,
    description: 'Whether the promotion is active. Defaults to true if not provided.',
  })
  @IsBoolean()
  @IsOptional()
  active?: boolean;

  // ============================================
  // PERCENTAGE_DISCOUNT fields
  // ============================================

  /**
   * Percentage off
   * Required for PERCENTAGE_DISCOUNT deal type
   * Must be between 0 and 100
   */
  @ApiPropertyOptional({
    example: 25,
    description:
      'Percentage discount (0-100). Required for PERCENTAGE_DISCOUNT deal type.',
    minimum: 0,
    maximum: 100,
  })
  @ValidateIf((o) => o.dealType === DealType.PERCENTAGE_DISCOUNT)
  @IsNumber()
  percentageOff?: number;

  // ============================================
  // FIXED_DISCOUNT fields
  // ============================================

  /**
   * Fixed amount off
   * Required for FIXED_DISCOUNT deal type
   * Must be greater than 0
   */
  @ApiPropertyOptional({
    example: 10,
    description:
      'Fixed amount discount (e.g., $10 off). Required for FIXED_DISCOUNT deal type.',
    minimum: 0,
  })
  @ValidateIf((o) => o.dealType === DealType.FIXED_DISCOUNT)
  @IsNumber()
  fixedAmountOff?: number;

  // ============================================
  // BOGO fields
  // ============================================

  /**
   * Buy quantity
   * Required for BOGO deal type
   * Number of items customer must buy
   */
  @ApiPropertyOptional({
    example: 1,
    description:
      'Number of items to buy (e.g., 1 for "Buy 1 Get 1"). Required for BOGO deal type.',
    minimum: 1,
  })
  @ValidateIf((o) => o.dealType === DealType.BOGO)
  @IsNumber()
  buyQuantity?: number;

  /**
   * Get quantity
   * Required for BOGO deal type
   * Number of items customer gets free
   */
  @ApiPropertyOptional({
    example: 1,
    description:
      'Number of items to get free (e.g., 1 for "Buy 1 Get 1"). Required for BOGO deal type.',
    minimum: 1,
  })
  @ValidateIf((o) => o.dealType === DealType.BOGO)
  @IsNumber()
  getQuantity?: number;

  // ============================================
  // BUNDLE fields
  // ============================================

  /**
   * Bundle price
   * Required for BUNDLE deal type
   * Fixed price for the entire bundle
   */
  @ApiPropertyOptional({
    example: 50,
    description:
      'Fixed price for the entire bundle. Required for BUNDLE deal type. Must have at least 2 products.',
    minimum: 0,
  })
  @ValidateIf((o) => o.dealType === DealType.BUNDLE)
  @IsNumber()
  bundlePrice?: number;

  // ============================================
  // QUANTITY_DISCOUNT fields
  // ============================================

  /**
   * Minimum quantity
   * Required for QUANTITY_DISCOUNT deal type
   * Minimum items needed to qualify for discount
   */
  @ApiPropertyOptional({
    example: 3,
    description:
      'Minimum quantity to qualify for discount (must be > 1). Required for QUANTITY_DISCOUNT deal type.',
    minimum: 2,
  })
  @ValidateIf((o) => o.dealType === DealType.QUANTITY_DISCOUNT)
  @IsNumber()
  minQuantity?: number;

  /**
   * Quantity discount
   * Required for QUANTITY_DISCOUNT deal type
   * Percentage discount when minimum quantity is met
   */
  @ApiPropertyOptional({
    example: 20,
    description:
      'Percentage discount when minimum quantity is met (0-100). Required for QUANTITY_DISCOUNT deal type.',
    minimum: 0,
    maximum: 100,
  })
  @ValidateIf((o) => o.dealType === DealType.QUANTITY_DISCOUNT)
  @IsNumber()
  quantityDiscount?: number;

  // ============================================
  // Product IDs (required for all deal types)
  // ============================================

  /**
   * Product IDs
   * Array of product IDs this promotion applies to
   * 
   * Subscription Tier Limits (Retailers only):
   * - BASIC: Maximum 10 products per promotion
   * - PRO: Unlimited products
   * 
   * Minimum requirements by deal type:
   * - BUNDLE: At least 2 products required
   * - BOGO: At least 1 product required (can specify buy/get products)
   * - All others: At least 1 product required
   */
  @ApiProperty({
    example: [1, 2, 3],
    description:
      'Array of product IDs this promotion applies to. BASIC tier allows max 10 products, PRO tier allows unlimited. BUNDLE deals require at least 2 products.',
    type: [Number],
    isArray: true,
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one product is required' })
  @IsNumber({}, { each: true })
  productIds: number[];
}