import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * Create Reply DTO
 * 
 * DTO for replying to a store review or another reply.
 * If parentReplyId is provided, this reply will be a reply to another reply (nested reply).
 * If parentReplyId is not provided, this reply will be a direct reply to the review.
 */
export class CreateReplyDto {
  @ApiProperty({
    example: 1,
    description: 'Review ID to reply to',
  })
  @IsInt()
  @IsNotEmpty()
  reviewId: number;

  @ApiPropertyOptional({
    example: 5,
    description: 'Optional parent reply ID - if provided, this reply will be a reply to another reply (nested reply)',
  })
  @IsInt()
  @IsOptional()
  parentReplyId?: number;

  @ApiProperty({
    example: 'Thank you for your feedback!',
    description: 'Reply comment',
  })
  @IsString()
  @IsNotEmpty()
  comment: string;
}
