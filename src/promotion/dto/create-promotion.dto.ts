import { IsString, IsNumber, IsOptional, IsDateString, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Create Promotion Data Transfer Object
 * 
 * DTO for creating new product promotions.
 * Promotions represent discounts or special offers for products.
 */
export class CreatePromotionDto {
  /**
   * Promotion title
   * A short, descriptive name for the promotion
   */
  @ApiProperty({ 
    example: 'Holiday Sale',
    description: 'Promotion title'
  })
  @IsString()
  title: string;

  /**
   * Promotion type
   * Describes the type of promotion (e.g., 'percentage', 'fixed', 'buy-one-get-one')
   */
  @ApiProperty({ 
    example: 'percentage',
    description: 'Type of promotion (e.g., percentage, fixed amount)'
  })
  @IsString()
  type: string;

  /**
   * Promotion description
   * Detailed description of the promotion and its terms
   */
  @ApiProperty({ 
    example: 'Up to 30% off select items',
    description: 'Detailed description of the promotion'
  })
  @IsString()
  description: string;

  /**
   * Promotion start date
   * When the promotion becomes active (defaults to now if not provided)
   */
  @ApiPropertyOptional({ 
    example: '2025-12-01T00:00:00.000Z',
    description: 'Promotion start date and time (ISO 8601 format). Defaults to current time if not provided.',
    format: 'date-time'
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
    description: 'Promotion end date and time (ISO 8601 format). If not provided, promotion has no end date.',
    format: 'date-time'
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
    description: 'Whether the promotion is active. Defaults to true if not provided.'
  })
  @IsBoolean()
  @IsOptional()
  active?: boolean;

  /**
   * Discount value
   * The discount amount (interpreted based on type - e.g., percentage or fixed amount)
   */
  @ApiProperty({ 
    example: 15, 
    description: 'Discount value. For percentage type, this is the percentage off (e.g., 15 = 15% off). For fixed type, this is the amount in currency units.'
  })
  @IsNumber()
  discount: number;

  /**
   * Product ID
   * The product this promotion applies to
   */
  @ApiProperty({ 
    example: 1,
    description: 'ID of the product this promotion applies to'
  })
  @IsNumber()
  productId: number;
}