import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export class ProductRecommendationDto {
  @IsString()
  userPreferences: string;

  @IsNumber()
  @IsOptional()
  count?: number;
}

export class PromotionRecommendationDto {
  @IsString()
  userPreferences: string;

  @IsNumber()
  @IsOptional()
  count?: number;
}

export class SimilarProductsDto {
  @IsNumber()
  productId: number;

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
  @IsString()
  query: string;

  @IsNumber()
  @IsOptional()
  count?: number;
}

export class FreeformRecommendationDto {
  @IsString()
  query: string;

  @IsNumber()
  @IsOptional()
  count?: number;
}