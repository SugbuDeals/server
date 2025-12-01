import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProductRecommendationDto {
  @ApiProperty({ example: 'laptops under 1000' })
  @IsString()
  userPreferences: string;

  @ApiPropertyOptional({ example: 5, description: 'Optional number of results' })
  @IsNumber()
  @IsOptional()
  count?: number;
}

export class PromotionRecommendationDto {
  @ApiProperty({ example: 'travel deals' })
  @IsString()
  userPreferences: string;

  @ApiPropertyOptional({ example: 3 })
  @IsNumber()
  @IsOptional()
  count?: number;
}

export class SimilarProductsDto {
  @ApiProperty({ example: 42 })
  @IsNumber()
  productId: number;

  @ApiPropertyOptional({ example: 10 })
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

  @ApiPropertyOptional({ example: 8 })
  @IsNumber()
  @IsOptional()
  count?: number;
}

export class FreeformRecommendationDto {
  @ApiProperty({ example: 'budget mechanical keyboard' })
  @IsString()
  query: string;

  @ApiPropertyOptional({ example: 6 })
  @IsNumber()
  @IsOptional()
  count?: number;

  @ApiPropertyOptional({ 
    example: 10.3157, 
    description: 'User latitude for distance calculation',
    minimum: -90,
    maximum: 90
  })
  @IsNumber()
  @IsOptional()
  latitude?: number;

  @ApiPropertyOptional({ 
    example: 123.8854, 
    description: 'User longitude for distance calculation',
    minimum: -180,
    maximum: 180
  })
  @IsNumber()
  @IsOptional()
  longitude?: number;
}
