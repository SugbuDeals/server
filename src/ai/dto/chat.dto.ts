import { IsArray, IsEnum, IsNumber, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GroqMessageDto {
  @ApiProperty({ enum: ['user', 'assistant', 'system'] })
  @IsEnum(['user', 'assistant', 'system'])
  role: 'user' | 'assistant' | 'system';

  @ApiProperty({ example: 'Hello!' })
  @IsString()
  content: string;
}

// 
export class ClassifyIntentResponseDto {
  @IsEnum(['product', 'store', 'promotion', 'chat'])
  intent: 'product' | 'store' | 'promotion' | 'chat';

  @IsNumber()
  confidence_score: number;
}

// ai chat body
export class ChatMessageDto {
  @ApiProperty({ example: 'Hello!' })
  @IsString()
  content: string;
}

// general chat output
export class GeneralChatResponseDto {
  @ApiProperty({ example: 'You are absolutely right!' })
  @IsString()
  content: string;
}