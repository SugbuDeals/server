import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { CreateReplyDto } from './dto/create-reply.dto';
import { ReviewResponseDto, ReplyResponseDto, StoreRatingStatsDto } from './dto/review-response.dto';
import { Prisma } from 'generated/prisma';

/**
 * Review Service
 * 
 * Service responsible for handling store review operations including:
 * - Creating and managing reviews
 * - Replying to reviews
 * - Liking/disliking reviews
 * - Calculating store rating statistics
 */
@Injectable()
export class ReviewService {
  private readonly logger = new Logger(ReviewService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Creates a new review (comment) for a store with optional rating.
   * Consumers can comment about the store, and optionally include a rating (1-5 stars).
   * Each user can only have one review per store.
   * 
   * @param userId - ID of the user creating the review
   * @param createReviewDto - Review data (storeId, comment, optional rating)
   * @returns Created review with user information
   * @throws {NotFoundException} If store doesn't exist
   * @throws {BadRequestException} If user already reviewed this store
   */
  async createReview(userId: number, createReviewDto: CreateReviewDto): Promise<ReviewResponseDto> {
    const { storeId, rating, comment } = createReviewDto;

    // Check if store exists
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
    });

    if (!store) {
      throw new NotFoundException(`Store with ID ${storeId} not found`);
    }

    // Check if user already reviewed this store
    const existingReview = await this.prisma.storeReview.findUnique({
      where: {
        userId_storeId: {
          userId,
          storeId,
        },
      },
    });

    if (existingReview) {
      throw new BadRequestException('You have already reviewed this store. You can update your existing review.');
    }

    // Create the review (comment with optional rating)
    const reviewData: any = {
      storeId,
      userId,
      comment,
    };
    
    if (rating !== undefined && rating !== null) {
      reviewData.rating = rating;
    }

    const review = await this.prisma.storeReview.create({
      data: reviewData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
          },
        },
      },
    });

    this.logger.log(`Review created: User ${userId} reviewed store ${storeId}${rating ? ` with rating ${rating}` : ' (comment only)'}`);

    return this.mapReviewToDto(review, userId);
  }

  /**
   * Updates an existing review (comment and/or rating).
   * 
   * @param userId - ID of the user updating the review
   * @param reviewId - ID of the review to update
   * @param rating - New rating (optional)
   * @param comment - New comment (optional)
   * @returns Updated review
   * @throws {NotFoundException} If review doesn't exist
   * @throws {ForbiddenException} If user doesn't own the review
   */
  async updateReview(
    userId: number,
    reviewId: number,
    rating?: number,
    comment?: string,
  ): Promise<ReviewResponseDto> {
    const review = await this.prisma.storeReview.findUnique({
      where: { id: reviewId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
          },
        },
      },
    });

    if (!review) {
      throw new NotFoundException(`Review with ID ${reviewId} not found`);
    }

    if (review.userId !== userId) {
      throw new ForbiddenException('You can only update your own reviews');
    }

    const updateData: any = {};
    if (rating !== undefined && rating !== null) {
      updateData.rating = rating;
    }
    if (comment !== undefined) {
      updateData.comment = comment;
    }

    const updatedReview = await this.prisma.storeReview.update({
      where: { id: reviewId },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
          },
        },
      },
    });

    this.logger.log(`Review updated: Review ${reviewId} by user ${userId}`);

    return this.mapReviewToDto(updatedReview, userId);
  }

  /**
   * Deletes a review.
   * 
   * @param userId - ID of the user deleting the review
   * @param reviewId - ID of the review to delete
   * @throws {NotFoundException} If review doesn't exist
   * @throws {ForbiddenException} If user doesn't own the review
   */
  async deleteReview(userId: number, reviewId: number): Promise<void> {
    const review = await this.prisma.storeReview.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException(`Review with ID ${reviewId} not found`);
    }

    if (review.userId !== userId) {
      throw new ForbiddenException('You can only delete your own reviews');
    }

    await this.prisma.storeReview.delete({
      where: { id: reviewId },
    });

    this.logger.log(`Review deleted: Review ${reviewId} by user ${userId}`);
  }

  /**
   * Gets all reviews for a store with pagination.
   * 
   * @param storeId - ID of the store
   * @param userId - Optional ID of the current user (for user-specific data like reactions)
   * @param skip - Number of records to skip
   * @param take - Number of records to take
   * @returns Array of reviews with user information and reaction counts
   */
  async getStoreReviews(
    storeId: number,
    userId?: number,
    skip: number = 0,
    take: number = 20,
  ): Promise<ReviewResponseDto[]> {
    try {
      // Check if store exists
      const store = await this.prisma.store.findUnique({
        where: { id: storeId },
      });

      if (!store) {
        throw new NotFoundException(`Store with ID ${storeId} not found`);
      }

      const reviews = await this.prisma.storeReview.findMany({
      where: { storeId },
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
          },
        },
        reactions: userId
          ? {
              where: { userId },
            }
          : false,
        _count: {
          select: {
            replies: true,
            reactions: true,
          },
        },
      },
    });

    // Get all reaction counts for all reviews
    const reviewIds = reviews.map((r) => r.id);
    
    // Only query if there are reviews
    let allReactions: Array<{ reviewId: number; isLike: boolean; _count: { id: number } }> = [];
    if (reviewIds.length > 0) {
      const reactions = await this.prisma.reviewReaction.groupBy({
        by: ['reviewId', 'isLike'],
        where: {
          reviewId: { in: reviewIds },
        },
        _count: { id: true },
      });
      allReactions = reactions;
    }

    // Create a map of reaction counts
    const reactionCounts = new Map<string, { likes: number; dislikes: number }>();
    allReactions.forEach((reaction) => {
      const key = reaction.reviewId.toString();
      if (!reactionCounts.has(key)) {
        reactionCounts.set(key, { likes: 0, dislikes: 0 });
      }
      const counts = reactionCounts.get(key)!;
      if (reaction.isLike) {
        counts.likes = reaction._count.id;
      } else {
        counts.dislikes = reaction._count.id;
      }
    });

    return reviews.map((review) => {
      const counts = reactionCounts.get(review.id.toString()) || { likes: 0, dislikes: 0 };
      const userReaction = review.reactions?.[0];

      return {
        id: review.id,
        storeId: review.storeId,
        userId: review.userId,
        userName: review.user.name,
        userImageUrl: review.user.imageUrl,
        rating: review.rating,
        comment: review.comment as string,
        createdAt: review.createdAt,
        updatedAt: review.updatedAt,
        likesCount: counts.likes,
        dislikesCount: counts.dislikes,
        repliesCount: review._count.replies,
        userLiked: userReaction?.isLike === true ? true : userReaction?.isLike === false ? false : null,
        userDisliked: userReaction?.isLike === false ? true : userReaction?.isLike === true ? false : null,
      };
    });
    } catch (error) {
      this.logger.error(`Error fetching store reviews for store ${storeId}:`, error);
      throw error;
    }
  }

  /**
   * Gets a single review by ID.
   * 
   * @param reviewId - ID of the review
   * @param userId - Optional ID of the current user
   * @returns Review with user information
   * @throws {NotFoundException} If review doesn't exist
   */
  async getReview(reviewId: number, userId?: number): Promise<ReviewResponseDto> {
    try {
      const review = await this.prisma.storeReview.findUnique({
      where: { id: reviewId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
          },
        },
        reactions: userId
          ? {
              where: { userId },
            }
          : false,
        _count: {
          select: {
            replies: true,
            reactions: true,
          },
        },
      },
    });

    if (!review) {
      throw new NotFoundException(`Review with ID ${reviewId} not found`);
    }

    // Get reaction counts
    const likesCount = await this.prisma.reviewReaction.count({
      where: { reviewId, isLike: true },
    });

    const dislikesCount = await this.prisma.reviewReaction.count({
      where: { reviewId, isLike: false },
    });

    const userReaction = review.reactions?.[0];

    return {
      id: review.id,
      storeId: review.storeId,
      userId: review.userId,
      userName: review.user.name,
      userImageUrl: review.user.imageUrl,
      rating: review.rating,
      comment: review.comment as string,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
      likesCount,
      dislikesCount,
      repliesCount: review._count.replies,
      userLiked: userReaction?.isLike === true ? true : userReaction?.isLike === false ? false : null,
      userDisliked: userReaction?.isLike === false ? true : userReaction?.isLike === true ? false : null,
    };
    } catch (error) {
      this.logger.error(`Error fetching review ${reviewId}:`, error);
      throw error;
    }
  }

  /**
   * Creates a reply to a review or another reply.
   * 
   * @param userId - ID of the user creating the reply
   * @param createReplyDto - Reply data (reviewId, comment, optional parentReplyId)
   * @returns Created reply with user information
   * @throws {NotFoundException} If review doesn't exist or parent reply doesn't exist
   * @throws {BadRequestException} If parent reply doesn't belong to the specified review
   */
  async createReply(userId: number, createReplyDto: CreateReplyDto): Promise<ReplyResponseDto> {
    const { reviewId, parentReplyId, comment } = createReplyDto;

    // Check if review exists
    const review = await this.prisma.storeReview.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException(`Review with ID ${reviewId} not found`);
    }

    // If replying to another reply, validate that the parent reply exists and belongs to the same review
    if (parentReplyId) {
      const parentReply = await this.prisma.reviewReply.findUnique({
        where: { id: parentReplyId },
      });

      if (!parentReply) {
        throw new NotFoundException(`Parent reply with ID ${parentReplyId} not found`);
      }

      if (parentReply.reviewId !== reviewId) {
        throw new BadRequestException('Parent reply does not belong to the specified review');
      }
    }

    const replyData: any = {
      reviewId,
      userId,
      comment,
    };

    if (parentReplyId !== undefined) {
      replyData.parentReplyId = parentReplyId;
    }

    const reply = await this.prisma.reviewReply.create({
      data: replyData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
          },
        },
      },
    });

    this.logger.log(`Reply created: User ${userId} replied to ${parentReplyId ? `reply ${parentReplyId}` : `review ${reviewId}`}`);

    return {
      id: reply.id,
      reviewId: reply.reviewId,
      userId: reply.userId,
      userName: reply.user.name,
      userImageUrl: reply.user.imageUrl,
      parentReplyId: (reply as any).parentReplyId ?? null,
      comment: reply.comment,
      createdAt: reply.createdAt,
      updatedAt: reply.updatedAt,
      replies: [],
    };
  }

  /**
   * Gets all replies for a review with nested replies.
   * Returns top-level replies (direct replies to the review) with their nested replies.
   * 
   * @param reviewId - ID of the review
   * @returns Array of top-level replies with nested replies
   * @throws {NotFoundException} If review doesn't exist
   */
  async getReplies(reviewId: number): Promise<ReplyResponseDto[]> {
    // Check if review exists
    const review = await this.prisma.storeReview.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException(`Review with ID ${reviewId} not found`);
    }

    // Fetch all replies for this review
    const allReplies = await this.prisma.reviewReply.findMany({
      where: { reviewId },
      orderBy: { createdAt: 'asc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
          },
        },
      },
    });

    // Convert to DTOs
    const replyDtos: ReplyResponseDto[] = allReplies.map((reply) => ({
      id: reply.id,
      reviewId: reply.reviewId,
      userId: reply.userId,
      userName: reply.user.name,
      userImageUrl: reply.user.imageUrl,
      parentReplyId: (reply as any).parentReplyId ?? null,
      comment: reply.comment,
      createdAt: reply.createdAt,
      updatedAt: reply.updatedAt,
      replies: [],
    }));

    // Build nested structure
    const replyMap = new Map<number, ReplyResponseDto>();
    const topLevelReplies: ReplyResponseDto[] = [];

    // First pass: create map and identify top-level replies
    replyDtos.forEach((reply) => {
      replyMap.set(reply.id, reply);
      if (reply.parentReplyId === null) {
        topLevelReplies.push(reply);
      }
    });

    // Second pass: nest replies under their parents
    replyDtos.forEach((reply) => {
      if (reply.parentReplyId !== null) {
        const parent = replyMap.get(reply.parentReplyId);
        if (parent && parent.replies) {
          parent.replies.push(reply);
        }
      }
    });

    return topLevelReplies;
  }

  /**
   * Likes or dislikes a review.
   * If the user already reacted, it updates the reaction.
   * If the user reacts with the same type, it removes the reaction.
   * 
   * @param userId - ID of the user reacting
   * @param reviewId - ID of the review
   * @param isLike - true for like, false for dislike
   * @returns Updated reaction status
   * @throws {NotFoundException} If review doesn't exist
   */
  async toggleReaction(userId: number, reviewId: number, isLike: boolean): Promise<{ isLike: boolean | null }> {
    // Check if review exists
    const review = await this.prisma.storeReview.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException(`Review with ID ${reviewId} not found`);
    }

    // Check if user already reacted
    const existingReaction = await this.prisma.reviewReaction.findUnique({
      where: {
        userId_reviewId: {
          userId,
          reviewId,
        },
      },
    });

    if (existingReaction) {
      // If same reaction type, remove it
      if (existingReaction.isLike === isLike) {
        await this.prisma.reviewReaction.delete({
          where: {
            userId_reviewId: {
              userId,
              reviewId,
            },
          },
        });
        this.logger.log(`Reaction removed: User ${userId} removed ${isLike ? 'like' : 'dislike'} from review ${reviewId}`);
        return { isLike: null };
      } else {
        // Update to new reaction type
        await this.prisma.reviewReaction.update({
          where: {
            userId_reviewId: {
              userId,
              reviewId,
            },
          },
          data: { isLike },
        });
        this.logger.log(`Reaction updated: User ${userId} ${isLike ? 'liked' : 'disliked'} review ${reviewId}`);
        return { isLike };
      }
    } else {
      // Create new reaction
      await this.prisma.reviewReaction.create({
        data: {
          userId,
          reviewId,
          isLike,
        },
      });
      this.logger.log(`Reaction created: User ${userId} ${isLike ? 'liked' : 'disliked'} review ${reviewId}`);
      return { isLike };
    }
  }

  /**
   * Calculates rating statistics for a store.
   * Only counts reviews that have ratings (comments without ratings are excluded).
   * 
   * @param storeId - ID of the store
   * @returns Rating statistics including average, total count, and breakdown by star rating
   * @throws {NotFoundException} If store doesn't exist
   */
  async getStoreRatingStats(storeId: number): Promise<StoreRatingStatsDto> {
    // Check if store exists
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
    });

    if (!store) {
      throw new NotFoundException(`Store with ID ${storeId} not found`);
    }

    // Get all reviews with ratings for the store (only count reviews that have ratings)
    const reviewsWithRatings = await this.prisma.storeReview.findMany({
      where: { 
        storeId,
        rating: { not: null as any },
      },
      select: { rating: true },
    });

    if (reviewsWithRatings.length === 0) {
      return {
        averageRating: 0,
        totalRatings: 0,
        fiveStarCount: 0,
        fourStarCount: 0,
        threeStarCount: 0,
        twoStarCount: 0,
        oneStarCount: 0,
      };
    }

    // Calculate statistics (only for reviews with ratings)
    const totalRatings = reviewsWithRatings.length;
    const sum = reviewsWithRatings.reduce((acc, review) => acc + (review.rating || 0), 0);
    const averageRating = sum / totalRatings;

    const fiveStarCount = reviewsWithRatings.filter((r) => r.rating === 5).length;
    const fourStarCount = reviewsWithRatings.filter((r) => r.rating === 4).length;
    const threeStarCount = reviewsWithRatings.filter((r) => r.rating === 3).length;
    const twoStarCount = reviewsWithRatings.filter((r) => r.rating === 2).length;
    const oneStarCount = reviewsWithRatings.filter((r) => r.rating === 1).length;

    return {
      averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal place
      totalRatings,
      fiveStarCount,
      fourStarCount,
      threeStarCount,
      twoStarCount,
      oneStarCount,
    };
  }

  /**
   * Maps a Prisma review to ReviewResponseDto.
   * 
   * @param review - Prisma review object
   * @param currentUserId - Optional current user ID for reaction data
   * @returns ReviewResponseDto
   */
  private async mapReviewToDto(review: any, currentUserId?: number): Promise<ReviewResponseDto> {
    const likesCount = await this.prisma.reviewReaction.count({
      where: { reviewId: review.id, isLike: true },
    });

    const dislikesCount = await this.prisma.reviewReaction.count({
      where: { reviewId: review.id, isLike: false },
    });

    const repliesCount = await this.prisma.reviewReply.count({
      where: { reviewId: review.id },
    });

    let userLiked: boolean | null = null;
    let userDisliked: boolean | null = null;

    if (currentUserId) {
      const userReaction = await this.prisma.reviewReaction.findUnique({
        where: {
          userId_reviewId: {
            userId: currentUserId,
            reviewId: review.id,
          },
        },
      });

      if (userReaction) {
        userLiked = userReaction.isLike;
        userDisliked = !userReaction.isLike;
      }
    }

    return {
      id: review.id,
      storeId: review.storeId,
      userId: review.userId,
      userName: review.user.name,
      userImageUrl: review.user.imageUrl,
      rating: review.rating,
      comment: review.comment as string,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
      likesCount,
      dislikesCount,
      repliesCount,
      userLiked,
      userDisliked,
    };
  }
}
