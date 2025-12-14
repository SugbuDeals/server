import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsBoolean } from 'class-validator';

/**
 * Query DTO for optional data includes to control response size
 * 
 * Allows clients to specify which related data to include in responses,
 * optimizing data transfer and query performance.
 * 
 * @example
 * ```
 * GET /stores/1/full?includeProducts=true&includePromotions=true
 * GET /products/with-details?includeStore=true&includePromotions=false
 * ```
 */
export class IncludeOptionsQueryDto {
  @ApiPropertyOptional({ 
    example: true,
    description: 'Include products in the response'
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  includeProducts?: boolean;

  @ApiPropertyOptional({ 
    example: true,
    description: 'Include promotions in the response'
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  includePromotions?: boolean;

  @ApiPropertyOptional({ 
    example: true,
    description: 'Include store details in the response'
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  includeStore?: boolean;

  @ApiPropertyOptional({ 
    example: true,
    description: 'Include category details in the response'
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  includeCategory?: boolean;
}
