import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

/**
 * Create Review DTO
 * 
 * DTO for creating a store review (comment) with optional rating.
 * Consumers can comment about the store, and optionally include a rating (1-5 stars).
 */
export class CreateReviewDto {
  @ApiProperty({
    example: 1,
    description: 'Store ID to review',
  })
  @IsInt()
  @IsNotEmpty()
  storeId: number;

  @ApiPropertyOptional({
    example: 5,
    description: 'Rating from 1 to 5 stars (optional - consumers can comment without rating)',
    minimum: 1,
    maximum: 5,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @ApiProperty({
    example: 'Great store with excellent products and service!',
    description: 'Review comment - the consumer\'s comment about the store',
  })
  @IsString()
  @IsNotEmpty()
  comment: string;
}
