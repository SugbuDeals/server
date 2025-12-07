import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Create Category Data Transfer Object
 * 
 * DTO for creating new product categories.
 * Categories are used to organize and group products.
 */
export class CreateCategoryDTO {
  /**
   * Category name
   * Must be unique and not empty
   */
  @ApiProperty({ 
    example: 'Electronics',
    description: 'Name of the category',
    minLength: 1
  })
  @IsString()
  @IsNotEmpty()
  name: string;
}


