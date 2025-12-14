import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsInt, Min, Max } from 'class-validator';

/**
 * Query DTO for pagination parameters with validation
 * 
 * Provides consistent pagination across all endpoints with:
 * - Skip: Number of records to skip (default: 0)
 * - Take: Number of records to return (default: 10, max: 100)
 * 
 * @example
 * ```
 * GET /products?skip=0&take=20
 * ```
 */
export class PaginationQueryDto {
  @ApiPropertyOptional({ 
    example: 0, 
    minimum: 0,
    description: 'Number of records to skip for pagination'
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number;

  @ApiPropertyOptional({ 
    example: 10, 
    minimum: 1, 
    maximum: 100,
    description: 'Number of records to return (max 100)'
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  take?: number;
}
