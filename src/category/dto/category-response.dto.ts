import { ApiProperty } from '@nestjs/swagger';

/**
 * Category Response DTO
 * 
 * Response DTO for category data.
 * Matches the Category model from Prisma schema.
 */
export class CategoryResponseDto {
  @ApiProperty({ example: 1, description: 'Category ID' })
  id: number;

  @ApiProperty({ example: 'Electronics', description: 'Category name' })
  name: string;

  @ApiProperty({ 
    example: '2024-01-01T00:00:00.000Z', 
    description: 'Category creation timestamp',
    type: String,
    format: 'date-time'
  })
  createdAt: Date;

  @ApiProperty({ 
    example: '2024-01-01T00:00:00.000Z', 
    description: 'Category last update timestamp',
    type: String,
    format: 'date-time'
  })
  updatedAt: Date;
}

