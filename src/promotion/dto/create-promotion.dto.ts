import { IsString, IsNumber, IsOptional, IsDateString, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePromotionDto {
  @ApiProperty({ example: 'Holiday Sale' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'percentage' })
  @IsString()
  type: string;

  @ApiProperty({ example: 'Up to 30% off select items' })
  @IsString()
  description: string;

  @ApiPropertyOptional({ example: '2025-12-01T00:00:00.000Z' })
  @IsDateString()
  @IsOptional()
  startsAt?: Date;

  @ApiPropertyOptional({ example: '2026-01-01T00:00:00.000Z' })
  @IsDateString()
  @IsOptional()
  endsAt?: Date;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @ApiProperty({ example: 15, description: 'Discount value; interpret by type' })
  @IsNumber()
  discount: number;

  @ApiProperty({ example: 1 })
  @IsNumber()
  productId: number;
}