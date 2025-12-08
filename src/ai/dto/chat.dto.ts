import { IsString, IsNumber, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Chat Request DTO
 * 
 * Unified request DTO for the AI chatbot endpoint. Supports:
 * - Single message content
 * - Location-aware recommendations (optional latitude/longitude/radius)
 * - Result count customization (required count parameter)
 * 
 * The chatbot intelligently handles:
 * - General conversation
 * - Product recommendations
 * - Store recommendations
 * - Promotion recommendations
 * - Similar products queries
 * 
 * @example Basic Chat
 * ```json
 * {
 *   "content": "Hello!",
 *   "count": 3
 * }
 * ```
 * 
 * @example Product Recommendation with Location
 * ```json
 * {
 *   "content": "Find me budget laptops",
 *   "latitude": 10.3157,
 *   "longitude": 123.8854,
 *   "radius": 10,
 *   "count": 5
 * }
 * ```
 */
export class ChatRequestDto {
  @ApiProperty({ 
    example: 'What phones are available?',
    description: 'The user\'s message content to send to the chatbot.'
  })
  @IsString()
  content: string;

  @ApiPropertyOptional({ 
    example: 10.3157, 
    description: 'User latitude for location-aware recommendations. Must be provided together with longitude. Range: -90 to 90.',
    minimum: -90,
    maximum: 90
  })
  @IsNumber()
  @IsOptional()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional({ 
    example: 123.8854, 
    description: 'User longitude for location-aware recommendations. Must be provided together with latitude. Range: -180 to 180.',
    minimum: -180,
    maximum: 180
  })
  @IsNumber()
  @IsOptional()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiPropertyOptional({ 
    example: 5, 
    description: 'Search radius in kilometers for location filtering. Valid options: 5, 10, or 15. Defaults to 5km if not specified. Only used when latitude and longitude are provided.',
    enum: [5, 10, 15],
    minimum: 5,
    maximum: 15
  })
  @IsNumber()
  @IsOptional()
  @Min(5)
  @Max(15)
  radius?: number;

  @ApiProperty({ 
    example: 3,
    description: 'Maximum number of results to return for recommendations. Range: 1-10.',
    minimum: 1,
    maximum: 10
  })
  @IsNumber()
  @Min(1)
  @Max(10)
  count: number;
}

export class TextGenerationDto {
  @ApiProperty({ example: 'Write a haiku about the sea' })
  @IsString()
  prompt: string;
}