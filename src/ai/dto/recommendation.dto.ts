import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProductRecommendationDto {
  @ApiProperty({ example: 'laptops under 1000' })
  @IsString()
  userPreferences: string;

  @ApiPropertyOptional({
    example: 10,
    description: 'Desired number of products (1-50). Defaults to 3.',
  })
  @IsNumber()
  @IsOptional()
  count?: number;
}

export class PromotionRecommendationDto {
  @ApiProperty({ example: 'travel deals' })
  @IsString()
  userPreferences: string;

  @ApiPropertyOptional({
    example: 5,
    description: 'Desired number of promotions (1-50). Defaults to 3.',
  })
  @IsNumber()
  @IsOptional()
  count?: number;
}

export class SimilarProductsDto {
  @ApiProperty({ example: 42 })
  @IsNumber()
  productId: number;

  @ApiPropertyOptional({
    example: 5,
    description: 'Number of similar products to include (1-50).',
  })
  @IsNumber()
  @IsOptional()
  count?: number;
}

export enum RecommendationType {
  PRODUCT = 'product',
  STORE = 'store',
  PROMOTION = 'promotion',
}

export class UnifiedRecommendationDto {
  @ApiProperty({ example: 'smartphones for gaming' })
  @IsString()
  query: string;

  @ApiPropertyOptional({
    example: 8,
    description: 'Desired number of recommendations across sources (1-50).',
  })
  @IsNumber()
  @IsOptional()
  count?: number;
}

export class FreeformRecommendationDto {
  @ApiProperty({ example: 'budget mechanical keyboard' })
  @IsString()
  query: string;

  @ApiPropertyOptional({
    example: 12,
    description: 'Desired number of product recommendations (1-50).',
  })
  @IsNumber()
  @IsOptional()
  count?: number;

  @ApiPropertyOptional({
    example: true,
    description: 'Set true to receive a more elaborate narrative response.',
  })
  @IsBoolean()
  @IsOptional()
  detailed?: boolean;
}
