import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty } from 'class-validator';

/**
 * Reaction DTO
 * 
 * DTO for liking or disliking a review.
 */
export class ReactionDto {
  @ApiProperty({
    example: 1,
    description: 'Review ID to react to',
  })
  @IsInt()
  @IsNotEmpty()
  reviewId: number;
}
