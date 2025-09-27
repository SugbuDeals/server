import { IsNumber, IsOptional, IsString } from 'class-validator';

export class ProductRecommendationDto {
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