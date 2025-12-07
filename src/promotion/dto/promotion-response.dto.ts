import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Promotion Response DTO
 * 
 * Response DTO for promotion data.
 * Matches the Promotion model from Prisma schema.
 */
export class PromotionResponseDto {
  @ApiProperty({ example: 1, description: 'Promotion ID' })
  id: number;

  @ApiProperty({ example: 'Summer Sale', description: 'Promotion title' })
  title: string;

  @ApiProperty({ example: 'PERCENTAGE', description: 'Promotion type' })
  type: string;

  @ApiProperty({ example: 'Get 20% off on all products', description: 'Promotion description' })
  description: string;

  @ApiProperty({ 
    example: '2024-01-01T00:00:00.000Z', 
    description: 'Promotion start timestamp',
    type: String,
    format: 'date-time'
  })
  startsAt: Date;

  @ApiPropertyOptional({ 
    example: '2024-01-31T23:59:59.000Z', 
    description: 'Promotion end timestamp',
    type: String,
    format: 'date-time',
    nullable: true
  })
  endsAt: Date | null;

  @ApiProperty({ example: true, description: 'Whether promotion is active' })
  active: boolean;

  @ApiProperty({ example: 20.0, description: 'Discount amount', type: Number })
  discount: number;

  @ApiPropertyOptional({ 
    example: 1, 
    description: 'Product ID (nullable)',
    nullable: true
  })
  productId: number | null;
}

