import { ApiProperty } from '@nestjs/swagger';

/**
 * Similar Products Response DTO
 * 
 * Response DTO for similar products recommendations.
 */
export class SimilarProductsResponseDto {
  @ApiProperty({ 
    example: 'assistant', 
    description: 'Role of the message sender',
    enum: ['user', 'assistant', 'system']
  })
  role: 'user' | 'assistant' | 'system';

  @ApiProperty({ 
    example: 'Here are some similar products:\n\n1. Samsung Galaxy S24\n   - similarity: Similar flagship smartphone with advanced features\n   - diff: Different camera system\n   - why: Great alternative with comparable performance\n\n2. Google Pixel 8\n   - similarity: High-end smartphone with excellent camera\n   - diff: Different operating system\n   - why: Best-in-class photography capabilities', 
    description: 'AI-generated recommendation text explaining similar products'
  })
  content: string;
}

