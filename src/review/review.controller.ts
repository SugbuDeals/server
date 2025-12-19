import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiParam,
  ApiQuery,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { ReviewService } from './review.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RolesGuard } from 'src/auth/roles.guard';
import { CreateReviewDto } from './dto/create-review.dto';
import { CreateReplyDto } from './dto/create-reply.dto';
import { ReactionDto } from './dto/reaction.dto';
import {
  ReviewResponseDto,
  ReplyResponseDto,
  StoreRatingStatsDto,
} from './dto/review-response.dto';
import { PayloadDTO } from 'src/auth/dto/payload.dto';
import { UserRole } from 'generated/prisma';
import { Roles } from 'src/auth/decorators/roles.decorator';

/**
 * Review Controller
 * 
 * Handles HTTP requests for store review operations.
 * Provides endpoints for creating, reading, updating, and deleting reviews,
 * as well as replying to reviews and liking/disliking them.
 * 
 * Access Control:
 * - Consumers can create, update, and delete their own reviews
 * - All authenticated users can view reviews and react to them
 * - All authenticated users (consumers, retailers, admins) can reply to reviews and other replies (nested replies)
 * - Retailers can reply to consumer comments/reviews
 * - Consumers can reply to retailer replies
 */
@ApiTags('Reviews')
@Controller('review')
export class ReviewController {
  constructor(private reviewService: ReviewService) {}

  /**
   * Creates a new review (comment) for a store with optional rating.
   * Consumers can comment about the store, and optionally include a rating (1-5 stars).
   * Each user can only have one review per store.
   * 
   * @param req - Request object containing authenticated user information
   * @param createReviewDto - Review data (storeId, comment, optional rating)
   * @returns Created review
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CONSUMER)
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Create a store review',
    description: 'Creates a new review (comment) for a store. Consumers can comment about the store, and optionally include a rating (1-5 stars). Each user can only have one review per store.',
  })
  @ApiCreatedResponse({
    description: 'Review created successfully',
    type: ReviewResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiBadRequestResponse({ description: 'Bad request - User already reviewed this store or invalid data' })
  @ApiNotFoundResponse({ description: 'Store not found' })
  async createReview(
    @Request() req: Request & { user: Omit<PayloadDTO, 'password'> },
    @Body() createReviewDto: CreateReviewDto,
  ): Promise<ReviewResponseDto> {
    return this.reviewService.createReview(req.user.sub, createReviewDto);
  }

  /**
   * Updates an existing review (comment and/or rating).
   * Users can only update their own reviews.
   * 
   * @param req - Request object containing authenticated user information
   * @param id - Review ID to update
   * @param body - Update data (rating and/or comment)
   * @returns Updated review
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CONSUMER)
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Update a review',
    description: 'Updates an existing review (comment and/or rating). Users can only update their own reviews.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Review ID',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Review updated successfully',
    type: ReviewResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiNotFoundResponse({ description: 'Review not found' })
  @ApiForbiddenResponse({ description: 'Forbidden - User does not own this review' })
  async updateReview(
    @Request() req: Request & { user: Omit<PayloadDTO, 'password'> },
    @Param('id') id: string,
    @Body() body: { rating?: number; comment?: string },
  ): Promise<ReviewResponseDto> {
    return this.reviewService.updateReview(req.user.sub, parseInt(id), body.rating, body.comment);
  }

  /**
   * Deletes a review.
   * Users can only delete their own reviews.
   * 
   * @param req - Request object containing authenticated user information
   * @param id - Review ID to delete
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CONSUMER)
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Delete a review',
    description: 'Deletes an existing review. Users can only delete their own reviews.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Review ID',
    example: 1,
  })
  @ApiOkResponse({ description: 'Review deleted successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiNotFoundResponse({ description: 'Review not found' })
  @ApiForbiddenResponse({ description: 'Forbidden - User does not own this review' })
  async deleteReview(
    @Request() req: Request & { user: Omit<PayloadDTO, 'password'> },
    @Param('id') id: string,
  ): Promise<void> {
    return this.reviewService.deleteReview(req.user.sub, parseInt(id));
  }

  /**
   * Gets all reviews for a store with pagination.
   * 
   * @param storeId - Store ID
   * @param req - Optional request object for authenticated users
   * @param skip - Number of records to skip
   * @param take - Number of records to take
   * @returns Array of reviews
   */
  @Get('store/:storeId')
  @ApiOperation({
    summary: 'Get store reviews',
    description: 'Retrieves all reviews for a specific store with pagination. If authenticated, includes user reaction data.',
  })
  @ApiParam({
    name: 'storeId',
    type: Number,
    description: 'Store ID',
    example: 1,
  })
  @ApiQuery({
    name: 'skip',
    required: false,
    type: Number,
    description: 'Number of records to skip for pagination',
    example: 0,
  })
  @ApiQuery({
    name: 'take',
    required: false,
    type: Number,
    description: 'Number of records to return',
    example: 20,
  })
  @ApiOkResponse({
    description: 'Reviews retrieved successfully',
    type: [ReviewResponseDto],
  })
  @ApiNotFoundResponse({ description: 'Store not found' })
  async getStoreReviews(
    @Param('storeId') storeId: string,
    @Request() req?: Request & { user?: Omit<PayloadDTO, 'password'> },
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ): Promise<ReviewResponseDto[]> {
    const userId = req?.user?.sub;
    return this.reviewService.getStoreReviews(
      parseInt(storeId),
      userId,
      skip ? parseInt(skip) : 0,
      take ? parseInt(take) : 20,
    );
  }

  /**
   * Gets a single review by ID.
   * 
   * @param id - Review ID
   * @param req - Optional request object for authenticated users
   * @returns Review details
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get a review',
    description: 'Retrieves a single review by ID. If authenticated, includes user reaction data.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Review ID',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Review retrieved successfully',
    type: ReviewResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Review not found' })
  async getReview(
    @Param('id') id: string,
    @Request() req?: Request & { user?: Omit<PayloadDTO, 'password'> },
  ): Promise<ReviewResponseDto> {
    const userId = req?.user?.sub;
    return this.reviewService.getReview(parseInt(id), userId);
  }

  /**
   * Creates a reply to a review or another reply.
   * 
   * @param req - Request object containing authenticated user information
   * @param createReplyDto - Reply data (reviewId, comment, optional parentReplyId)
   * @returns Created reply
   */
  @Post('reply')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Reply to a review or another reply',
    description: 'Creates a reply to an existing review or another reply. If parentReplyId is provided, this will be a nested reply. All authenticated users (consumers, retailers, admins) can reply to reviews and replies. Retailers can reply to consumer comments, and consumers can reply to retailer replies.',
  })
  @ApiCreatedResponse({
    description: 'Reply created successfully',
    type: ReplyResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiNotFoundResponse({ description: 'Review not found' })
  async createReply(
    @Request() req: Request & { user: Omit<PayloadDTO, 'password'> },
    @Body() createReplyDto: CreateReplyDto,
  ): Promise<ReplyResponseDto> {
    return this.reviewService.createReply(req.user.sub, createReplyDto);
  }

  /**
   * Gets all replies for a review with nested replies.
   *
   * @param reviewId - Review ID
   * @returns Array of top-level replies with nested replies
   */
  @Get('reply/:reviewId')
  @ApiOperation({
    summary: 'Get review replies with nested replies',
    description: 'Retrieves all top-level replies for a specific review, including nested replies (replies to replies).',
  })
  @ApiParam({
    name: 'reviewId',
    type: Number,
    description: 'Review ID',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Replies retrieved successfully',
    type: [ReplyResponseDto],
  })
  @ApiNotFoundResponse({ description: 'Review not found' })
  async getReplies(@Param('reviewId') reviewId: string): Promise<ReplyResponseDto[]> {
    return this.reviewService.getReplies(parseInt(reviewId));
  }

  /**
   * Likes a review.
   * Toggles the like - if already liked, removes the like.
   * 
   * @param req - Request object containing authenticated user information
   * @param reactionDto - Reaction data (reviewId)
   * @returns Updated reaction status
   */
  @Post('like')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Like a review',
    description: 'Likes a review. If already liked, removes the like. If disliked, changes to like.',
  })
  @ApiOkResponse({
    description: 'Reaction updated successfully',
    schema: {
      type: 'object',
      properties: {
        isLike: {
          type: 'boolean',
          nullable: true,
          description: 'true if liked, false if disliked, null if no reaction',
        },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiNotFoundResponse({ description: 'Review not found' })
  async likeReview(
    @Request() req: Request & { user: Omit<PayloadDTO, 'password'> },
    @Body() reactionDto: ReactionDto,
  ): Promise<{ isLike: boolean | null }> {
    return this.reviewService.toggleReaction(req.user.sub, reactionDto.reviewId, true);
  }

  /**
   * Dislikes a review.
   * Toggles the dislike - if already disliked, removes the dislike.
   * 
   * @param req - Request object containing authenticated user information
   * @param reactionDto - Reaction data (reviewId)
   * @returns Updated reaction status
   */
  @Post('dislike')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Dislike a review',
    description: 'Dislikes a review. If already disliked, removes the dislike. If liked, changes to dislike.',
  })
  @ApiOkResponse({
    description: 'Reaction updated successfully',
    schema: {
      type: 'object',
      properties: {
        isLike: {
          type: 'boolean',
          nullable: true,
          description: 'true if liked, false if disliked, null if no reaction',
        },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiNotFoundResponse({ description: 'Review not found' })
  async dislikeReview(
    @Request() req: Request & { user: Omit<PayloadDTO, 'password'> },
    @Body() reactionDto: ReactionDto,
  ): Promise<{ isLike: boolean | null }> {
    return this.reviewService.toggleReaction(req.user.sub, reactionDto.reviewId, false);
  }

  /**
   * Gets rating statistics for a store.
   * 
   * @param storeId - Store ID
   * @returns Rating statistics
   */
  @Get('stats/:storeId')
  @ApiOperation({
    summary: 'Get store rating statistics',
    description: 'Retrieves rating statistics for a store including average rating, total count, and breakdown by star rating.',
  })
  @ApiParam({
    name: 'storeId',
    type: Number,
    description: 'Store ID',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Rating statistics retrieved successfully',
    type: StoreRatingStatsDto,
  })
  @ApiNotFoundResponse({ description: 'Store not found' })
  async getStoreRatingStats(@Param('storeId') storeId: string): Promise<StoreRatingStatsDto> {
    return this.reviewService.getStoreRatingStats(parseInt(storeId));
  }
}
