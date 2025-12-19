import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Review Response DTO
 * 
 * Response DTO for store review data.
 * Reviews are comments from consumers about the store, and they include a rating.
 */
export class ReviewResponseDto {
  @ApiProperty({ example: 1, description: 'Review ID' })
  id: number;

  @ApiProperty({ example: 1, description: 'Store ID' })
  storeId: number;

  @ApiProperty({ example: 1, description: 'User ID who created the review' })
  userId: number;

  @ApiProperty({ example: 'John Doe', description: 'User name' })
  userName: string;

  @ApiPropertyOptional({ example: 'http://localhost:3000/files/image.jpg', description: 'User image URL', nullable: true })
  userImageUrl: string | null;

  @ApiPropertyOptional({ example: 5, description: 'Rating from 1 to 5 stars (optional - consumers can comment without rating)', minimum: 1, maximum: 5, nullable: true })
  rating: number | null;

  @ApiProperty({ example: 'Great store with excellent products and service!', description: 'Review comment - the consumer\'s comment about the store' })
  comment: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Review creation timestamp', type: String, format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Review last update timestamp', type: String, format: 'date-time' })
  updatedAt: Date;

  @ApiProperty({ example: 5, description: 'Number of likes', default: 0 })
  likesCount: number;

  @ApiProperty({ example: 1, description: 'Number of dislikes', default: 0 })
  dislikesCount: number;

  @ApiProperty({ example: 2, description: 'Number of replies', default: 0 })
  repliesCount: number;

  @ApiPropertyOptional({ example: true, description: 'Whether current user liked this review', nullable: true })
  userLiked: boolean | null;

  @ApiPropertyOptional({ example: false, description: 'Whether current user disliked this review', nullable: true })
  userDisliked: boolean | null;
}

/**
 * Reply Response DTO
 * 
 * Response DTO for review reply data.
 * Supports nested replies - replies can have child replies (replies to replies).
 */
export class ReplyResponseDto {
  @ApiProperty({ example: 1, description: 'Reply ID' })
  id: number;

  @ApiProperty({ example: 1, description: 'Review ID this reply belongs to' })
  reviewId: number;

  @ApiProperty({ example: 1, description: 'User ID who created the reply' })
  userId: number;

  @ApiProperty({ example: 'Jane Doe', description: 'User name' })
  userName: string;

  @ApiPropertyOptional({ example: 'http://localhost:3000/files/image.jpg', description: 'User image URL', nullable: true })
  userImageUrl: string | null;

  @ApiPropertyOptional({ example: 5, description: 'Parent reply ID - if this is a reply to another reply', nullable: true })
  parentReplyId: number | null;

  @ApiProperty({ example: 'Thank you for your feedback!', description: 'Reply comment' })
  comment: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Reply creation timestamp', type: String, format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z', description: 'Reply last update timestamp', type: String, format: 'date-time' })
  updatedAt: Date;

  @ApiPropertyOptional({ 
    type: [ReplyResponseDto],
    description: 'Nested replies - replies to this reply',
    default: []
  })
  replies?: ReplyResponseDto[];
}

/**
 * Store Rating Statistics DTO
 * 
 * Response DTO for store rating statistics.
 */
export class StoreRatingStatsDto {
  @ApiProperty({ example: 4.5, description: 'Average rating (1-5)' })
  averageRating: number;

  @ApiProperty({ example: 100, description: 'Total number of ratings' })
  totalRatings: number;

  @ApiProperty({ example: 50, description: 'Number of 5-star ratings' })
  fiveStarCount: number;

  @ApiProperty({ example: 30, description: 'Number of 4-star ratings' })
  fourStarCount: number;

  @ApiProperty({ example: 10, description: 'Number of 3-star ratings' })
  threeStarCount: number;

  @ApiProperty({ example: 5, description: 'Number of 2-star ratings' })
  twoStarCount: number;

  @ApiProperty({ example: 5, description: 'Number of 1-star ratings' })
  oneStarCount: number;
}
