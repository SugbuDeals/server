import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Update Category Data Transfer Object
 * 
 * DTO for updating existing product categories.
 * All fields are optional - only provided fields will be updated.
 */
export class UpdateCategoryDTO {
  /**
   * Updated category name
   * Optional - only updates if provided
   */
  @ApiPropertyOptional({ 
    example: 'Consumer Electronics',
    description: 'Updated name of the category'
  })
  @IsString()
  @IsOptional()
  name?: string;
}


