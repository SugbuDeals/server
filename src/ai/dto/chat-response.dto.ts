import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Chat Response DTO
 * 
 * Response DTO for AI chat interactions.
 */
export class ChatResponseDto {
  @ApiProperty({ 
    example: 'assistant', 
    description: 'Role of the message sender',
    enum: ['user', 'assistant', 'system']
  })
  role: 'user' | 'assistant' | 'system';

  @ApiProperty({ 
    example: 'Hello! How can I help you today?', 
    description: 'The message content from the AI assistant'
  })
  content: string;
}

