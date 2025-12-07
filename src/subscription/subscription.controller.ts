import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiBearerAuth,
  ApiQuery,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiCreatedResponse,
} from '@nestjs/swagger';
import { SubscriptionService } from './subscription.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CreateSubscriptionDTO } from './dto/create-subscription.dto';
import { UpdateSubscriptionDTO } from './dto/update-subscription.dto';
import { JoinSubscriptionDTO } from './dto/join-subscription.dto';
import { UpdateRetailerSubscriptionDTO } from './dto/update-retailer-subscription.dto';
import { SubscriptionAnalyticsDTO } from './dto/subscription-analytics.dto';
import { SubscriptionResponseDto, UserSubscriptionResponseDto } from './dto/subscription-response.dto';
import {
  Prisma,
  Subscription,
  SubscriptionStatus,
  SubscriptionPlan,
  UserRole,
  UserSubscription,
} from 'generated/prisma';
import { PayloadDTO } from 'src/auth/dto/payload.dto';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { RolesGuard } from 'src/auth/roles.guard';

/**
 * Subscription Controller
 * 
 * Handles HTTP requests for subscription management operations.
 * Provides endpoints for managing subscription plans (admin) and user subscriptions (retailers).
 * 
 * Access Control:
 * - All authenticated users can view available subscription plans
 * - Only admins can create/update/delete subscription plans
 * - Only retailers can join, update, or cancel their subscriptions
 * - Users can only view their own active subscription
 */
@ApiTags('Subscriptions')
@Controller('subscription')
export class SubscriptionController {
  constructor(private subscriptionService: SubscriptionService) {}

  /**
   * Retrieves a list of subscription plans with optional filtering.
   * 
   * Non-admin users only see active plans. Admins can filter by plan type,
   * active status, and search by name/description.
   * 
   * @param req - Request object containing authenticated user information
   * @param plan - Optional filter by plan type (admin only)
   * @param isActive - Optional filter by active status (admin only)
   * @param search - Optional search by name or description (admin only)
   * @param skip - Number of records to skip for pagination
   * @param take - Number of records to return
   * @returns Array of subscription plans matching the criteria
   * @throws {BadRequestException} If pagination parameters are invalid
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ 
    summary: 'List subscription plans',
    description: 'Retrieves a paginated list of subscription plans. Non-admin users only see active plans. Admins can filter and search.'
  })
  @ApiQuery({
    name: 'plan',
    required: false,
    enum: SubscriptionPlan,
    description: 'Filter by subscription plan type (admin only)',
    example: SubscriptionPlan.PREMIUM
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    type: Boolean,
    description: 'Filter by availability status (admin only). Non-admins automatically see only active plans.',
    example: true
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by subscription name or description (admin only, case-insensitive)',
    example: 'premium'
  })
  @ApiQuery({
    name: 'skip',
    required: false,
    type: Number,
    description: 'Number of records to skip for pagination',
    example: 0,
    minimum: 0
  })
  @ApiQuery({
    name: 'take',
    required: false,
    type: Number,
    description: 'Number of records to return',
    example: 10,
    minimum: 1
  })
  @ApiOkResponse({ 
    description: 'Returns paginated list of subscription plans',
    type: [SubscriptionResponseDto]
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiBadRequestResponse({ 
    description: 'Invalid pagination parameters',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Skip must be a non-negative number' }
      }
    }
  })
  async findManySubscriptions(
    @Request() req: Request & { user: Omit<PayloadDTO, 'password'> },
    @Query('plan') plan?: SubscriptionPlan,
    @Query('isActive') isActive?: string,
    @Query('search') search?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ): Promise<Subscription[]> {
    const requestingUser = req.user;
    const skipNum = skip ? parseInt(skip, 10) : undefined;
    const takeNum = take ? parseInt(take, 10) : undefined;

    if (skipNum !== undefined && (Number.isNaN(skipNum) || skipNum < 0)) {
      throw new BadRequestException('Skip must be a non-negative number');
    }
    if (takeNum !== undefined && (Number.isNaN(takeNum) || takeNum <= 0)) {
      throw new BadRequestException('Take must be a positive number');
    }

    const where: Prisma.SubscriptionWhereInput = {};

    if (requestingUser.role !== UserRole.ADMIN) {
      where.isActive = true;
    } else {
      if (typeof isActive === 'string') {
        where.isActive = isActive === 'true';
      }
      if (plan) {
        where.plan = plan;
      }
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ];
      }
    }

    return this.subscriptionService.subscriptions({
      skip: skipNum,
      take: takeNum,
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Retrieves the active subscription for a user.
   * 
   * Users can only view their own active subscription. Admins can view any user's subscription.
   * 
   * @param req - Request object containing authenticated user information
   * @param userId - ID of the user whose active subscription to retrieve
   * @returns Active user subscription with plan details, or null if none exists
   * @throws {BadRequestException} If user ID is invalid
   * @throws {ForbiddenException} If user tries to view another user's subscription (unless admin)
   */
  @Get('user/:userId/active')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ 
    summary: 'Get active subscription for a user',
    description: 'Retrieves the active subscription for a user. Users can only view their own subscription. Admins can view any user\'s subscription.'
  })
  @ApiParam({
    name: 'userId',
    required: true,
    description: 'User ID to get active subscription for',
    type: Number,
    example: 1
  })
  @ApiOkResponse({ 
    description: 'Returns the active user subscription with plan details',
    type: UserSubscriptionResponseDto
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({ 
    description: 'Forbidden - User cannot view another user\'s subscription',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 403 },
        message: { type: 'string', example: 'You are not allowed to view subscriptions for other users' }
      }
    }
  })
  @ApiBadRequestResponse({ 
    description: 'Invalid user ID',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Invalid user ID' }
      }
    }
  })
  async getActiveSubscription(
    @Request() req: Request & { user: Omit<PayloadDTO, 'password'> },
    @Param('userId') userId: string,
  ): Promise<UserSubscription | null> {
    const requestingUser = req.user;
    const userIdNum = Number(userId);

    if (!userIdNum || Number.isNaN(userIdNum)) {
      throw new BadRequestException('Invalid user ID');
    }

    // Non-admin users can only see their own active subscription
    if (
      requestingUser.role !== UserRole.ADMIN &&
      requestingUser.sub !== userIdNum
    ) {
      throw new ForbiddenException(
        'You are not allowed to view subscriptions for other users',
      );
    }

    return this.subscriptionService.getActiveUserSubscription(userIdNum);
  }

  /**
   * Retrieves a single subscription plan by its ID.
   * 
   * Non-admin users cannot view inactive subscription plans.
   * 
   * @param req - Request object containing authenticated user information
   * @param id - Subscription plan ID
   * @returns Subscription plan object or null if not found
   * @throws {BadRequestException} If subscription ID is invalid
   * @throws {ForbiddenException} If non-admin tries to view inactive subscription
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ 
    summary: 'Get subscription by id',
    description: 'Retrieves detailed information about a specific subscription plan by its ID. Non-admin users cannot view inactive plans.'
  })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'Subscription plan ID',
    type: Number,
    example: 1
  })
  @ApiOkResponse({ 
    description: 'Returns subscription plan details',
    type: SubscriptionResponseDto
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({ 
    description: 'Forbidden - Non-admin cannot view inactive subscription',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 403 },
        message: { type: 'string', example: 'You are not allowed to view inactive subscriptions' }
      }
    }
  })
  @ApiBadRequestResponse({ 
    description: 'Invalid subscription ID',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Invalid subscription ID' }
      }
    }
  })
  async findUniqueSubscription(
    @Request() req: Request & { user: Omit<PayloadDTO, 'password'> },
    @Param('id') id: string,
  ): Promise<Subscription | null> {
    const requestingUser = req.user;
    const subscriptionId = Number(id);

    if (!subscriptionId || Number.isNaN(subscriptionId)) {
      throw new BadRequestException('Invalid subscription ID');
    }

    const subscription = await this.subscriptionService.subscription({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      return null;
    }

    if (!subscription.isActive && requestingUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'You are not allowed to view inactive subscriptions',
      );
    }

    return subscription;
  }

  /**
   * Creates a new subscription plan (Admin only).
   * 
   * After creation, if the plan is active, all retailers are notified
   * about the new subscription availability.
   * 
   * @param req - Request object containing authenticated admin user information
   * @param createSubscriptionDTO - Subscription plan creation data
   * @returns Created subscription plan object
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('bearer')
  @ApiOperation({ 
    summary: 'Create a subscription plan',
    description: 'Creates a new subscription plan template. Restricted to admins only. If active, all retailers are notified.'
  })
  @ApiBody({ type: CreateSubscriptionDTO })
  @ApiCreatedResponse({ 
    description: 'Subscription plan created successfully',
    type: SubscriptionResponseDto
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({ 
    description: 'Forbidden - Only admins can create subscription plans',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 403 }
      }
    }
  })
  @ApiBadRequestResponse({ 
    description: 'Invalid input or validation error',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'array', items: { type: 'string' } }
      }
    }
  })
  async createSubscription(
    @Request() req: Request & { user: Omit<PayloadDTO, 'password'> },
    @Body() createSubscriptionDTO: CreateSubscriptionDTO,
  ): Promise<Subscription> {
    const data: Prisma.SubscriptionCreateInput = {
      name: createSubscriptionDTO.name,
      description: createSubscriptionDTO.description,
      plan: createSubscriptionDTO.plan,
      billingCycle: createSubscriptionDTO.billingCycle,
      price: createSubscriptionDTO.price ?? '0',
      benefits: createSubscriptionDTO.benefits,
      isActive: createSubscriptionDTO.isActive,
      startsAt: createSubscriptionDTO.startsAt
        ? new Date(createSubscriptionDTO.startsAt)
        : undefined,
      endsAt: createSubscriptionDTO.endsAt
        ? new Date(createSubscriptionDTO.endsAt)
        : undefined,
    };

    return this.subscriptionService.createPlan({ data });
  }

  /**
   * Updates an existing subscription plan (Admin only).
   * 
   * @param req - Request object containing authenticated admin user information
   * @param id - Subscription plan ID to update
   * @param updateSubscriptionDTO - Subscription plan update data (all fields optional)
   * @returns Updated subscription plan object
   * @throws {BadRequestException} If subscription ID is invalid or subscription not found
   * @throws {ForbiddenException} If user is not an admin
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('bearer')
  @ApiOperation({ 
    summary: 'Update a subscription plan',
    description: 'Updates subscription plan information. Restricted to admins only.'
  })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'Subscription plan ID to update',
    type: Number,
    example: 1
  })
  @ApiBody({ type: UpdateSubscriptionDTO })
  @ApiOkResponse({ 
    description: 'Subscription plan updated successfully',
    type: SubscriptionResponseDto
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({ 
    description: 'Forbidden - Only admins can update subscription plans',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 403 }
      }
    }
  })
  @ApiBadRequestResponse({ 
    description: 'Invalid subscription ID or subscription not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Subscription not found' }
      }
    }
  })
  async updateSubscription(
    @Request() req: Request & { user: Omit<PayloadDTO, 'password'> },
    @Param('id') id: string,
    @Body() updateSubscriptionDTO: UpdateSubscriptionDTO,
  ): Promise<Subscription> {
    const subscriptionId = Number(id);

    if (!subscriptionId || Number.isNaN(subscriptionId)) {
      throw new BadRequestException('Invalid subscription ID');
    }

    const existingSubscription = await this.subscriptionService.subscription({
      where: { id: subscriptionId },
    });

    if (!existingSubscription) {
      throw new BadRequestException('Subscription not found');
    }

    const data: Prisma.SubscriptionUpdateInput = {
      name: updateSubscriptionDTO.name,
      description: updateSubscriptionDTO.description,
      plan: updateSubscriptionDTO.plan,
      billingCycle: updateSubscriptionDTO.billingCycle,
      price: updateSubscriptionDTO.price,
      benefits: updateSubscriptionDTO.benefits,
      isActive: updateSubscriptionDTO.isActive,
      startsAt: updateSubscriptionDTO.startsAt
        ? new Date(updateSubscriptionDTO.startsAt)
        : undefined,
      endsAt: updateSubscriptionDTO.endsAt
        ? new Date(updateSubscriptionDTO.endsAt)
        : undefined,
    };

    return this.subscriptionService.updatePlan({
      where: { id: subscriptionId },
      data,
    });
  }

  /**
   * Deletes a subscription plan (Admin only).
   * 
   * Note: This does not delete user subscriptions that reference this plan.
   * Existing user subscriptions will maintain their reference to the deleted plan.
   * 
   * @param req - Request object containing authenticated admin user information
   * @param id - Subscription plan ID to delete
   * @returns Deleted subscription plan object
   * @throws {BadRequestException} If subscription ID is invalid or subscription not found
   * @throws {ForbiddenException} If user is not an admin
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('bearer')
  @ApiOperation({ 
    summary: 'Delete a subscription plan',
    description: 'Permanently deletes a subscription plan. Restricted to admins only. Existing user subscriptions maintain their reference to the deleted plan.'
  })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'Subscription plan ID to delete',
    type: Number,
    example: 1
  })
  @ApiOkResponse({ 
    description: 'Subscription plan deleted successfully',
    type: SubscriptionResponseDto
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({ 
    description: 'Forbidden - Only admins can delete subscription plans',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 403 }
      }
    }
  })
  @ApiBadRequestResponse({ 
    description: 'Invalid subscription ID or subscription not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Subscription not found' }
      }
    }
  })
  async deleteSubscription(
    @Request() req: Request & { user: Omit<PayloadDTO, 'password'> },
    @Param('id') id: string,
  ): Promise<Subscription> {
    const subscriptionId = Number(id);

    if (!subscriptionId || Number.isNaN(subscriptionId)) {
      throw new BadRequestException('Invalid subscription ID');
    }

    // Check if subscription exists and user has permission
    const existingSubscription = await this.subscriptionService.subscription({
      where: { id: subscriptionId },
    });

    if (!existingSubscription) {
      throw new BadRequestException('Subscription not found');
    }

    return this.subscriptionService.deletePlan({
      where: { id: subscriptionId },
    });
  }

  /**
   * Joins a subscription plan (Retailer only).
   * 
   * If the retailer already has an active subscription, it will be automatically
   * cancelled before creating the new one. This ensures only one active subscription per retailer.
   * 
   * @param req - Request object containing authenticated retailer user information
   * @param joinSubscriptionDTO - Subscription join data containing subscription plan ID
   * @returns Newly created user subscription with plan details
   * @throws {BadRequestException} If subscription ID is invalid or subscription not available
   * @throws {ForbiddenException} If user is not a retailer
   */
  @Post('retailer/join')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RETAILER)
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Join a subscription (Retailer only)',
    description:
      'Retailers can join a subscription plan by ID. If they already have an active subscription, it will be automatically cancelled first. Ensures only one active subscription per retailer.'
  })
  @ApiBody({ type: JoinSubscriptionDTO })
  @ApiCreatedResponse({ 
    description: 'Subscription joined successfully',
    type: UserSubscriptionResponseDto
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({ 
    description: 'Forbidden - Only retailers can join subscriptions',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 403 }
      }
    }
  })
  @ApiBadRequestResponse({ 
    description: 'Invalid subscription ID or subscription not available',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Subscription not available' }
      }
    }
  })
  async joinSubscription(
    @Request() req: Request & { user: Omit<PayloadDTO, 'password'> },
    @Body() joinSubscriptionDTO: JoinSubscriptionDTO,
  ): Promise<UserSubscription> {
    const requestingUser = req.user;
    if (!joinSubscriptionDTO.subscriptionId || Number.isNaN(joinSubscriptionDTO.subscriptionId)) {
      throw new BadRequestException('Invalid subscription ID');
    }

    return this.subscriptionService.joinSubscription(
      requestingUser.sub,
      joinSubscriptionDTO.subscriptionId,
    );
  }

  /**
   * Updates the retailer's active subscription to a different plan (Retailer only).
   * 
   * Cancels the current active subscription and creates a new one with the specified plan.
   * Requires an existing active subscription.
   * 
   * @param req - Request object containing authenticated retailer user information
   * @param updateRetailerSubscriptionDTO - Subscription update data containing new subscription plan ID
   * @returns Newly created user subscription with plan details
   * @throws {BadRequestException} If no active subscription exists or new subscription not available
   * @throws {ForbiddenException} If user is not a retailer
   */
  @Patch('retailer/update')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RETAILER)
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Update current subscription (Retailer only)',
    description:
      'Retailers can update their active subscription to a different subscription plan. The current subscription is cancelled and a new one is created. Requires an existing active subscription.'
  })
  @ApiBody({ type: UpdateRetailerSubscriptionDTO })
  @ApiOkResponse({ 
    description: 'Subscription updated successfully',
    type: UserSubscriptionResponseDto
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({ 
    description: 'Forbidden - Only retailers can update subscriptions',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 403 }
      }
    }
  })
  @ApiBadRequestResponse({ 
    description: 'No active subscription found or subscription not available',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'No active subscription found' }
      }
    }
  })
  async updateRetailerSubscription(
    @Request() req: Request & { user: Omit<PayloadDTO, 'password'> },
    @Body() updateRetailerSubscriptionDTO: UpdateRetailerSubscriptionDTO,
  ): Promise<UserSubscription> {
    const requestingUser = req.user;
    if (!updateRetailerSubscriptionDTO.subscriptionId || Number.isNaN(updateRetailerSubscriptionDTO.subscriptionId)) {
      throw new BadRequestException('Invalid subscription ID');
    }

    return this.subscriptionService.updateRetailerSubscription(
      requestingUser.sub,
      updateRetailerSubscriptionDTO.subscriptionId,
    );
  }

  /**
   * Cancels the retailer's active subscription (Retailer only).
   * 
   * Sets the subscription status to CANCELLED and records the cancellation timestamp.
   * 
   * @param req - Request object containing authenticated retailer user information
   * @returns Cancelled user subscription with plan details
   * @throws {BadRequestException} If no active subscription exists
   * @throws {ForbiddenException} If user is not a retailer
   */
  @Post('retailer/cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RETAILER)
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Cancel current subscription (Retailer only)',
    description:
      'Retailers can cancel their active subscription. The subscription status will be set to CANCELLED and a cancellation timestamp will be recorded. Requires an existing active subscription.'
  })
  @ApiOkResponse({ 
    description: 'Subscription cancelled successfully',
    type: UserSubscriptionResponseDto
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({ 
    description: 'Forbidden - Only retailers can cancel subscriptions',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 403 }
      }
    }
  })
  @ApiBadRequestResponse({ 
    description: 'No active subscription found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'No active subscription found' }
      }
    }
  })
  async cancelRetailerSubscription(
    @Request() req: Request & { user: Omit<PayloadDTO, 'password'> },
  ): Promise<UserSubscription> {
    const requestingUser = req.user;
    return this.subscriptionService.cancelRetailerSubscription(
      requestingUser.sub,
    );
  }

  /**
   * Gets comprehensive subscription analytics (Admin only).
   * 
   * Returns detailed analytics including:
   * - Total subscriptions and counts by status
   * - Counts by plan type and billing cycle
   * - Revenue metrics (total and average)
   * - Recent subscription trends
   * 
   * @param req - Request object containing authenticated admin user information
   * @returns Subscription analytics data
   * @throws {ForbiddenException} If user is not an admin
   */
  @Get('admin/analytics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Get subscription analytics (Admin only)',
    description:
      'Returns comprehensive subscription analytics for the admin dashboard, including counts by status, plan, billing cycle, revenue metrics (total and average), and subscription trends (recent subscriptions and monthly counts).'
  })
  @ApiOkResponse({
    description: 'Returns comprehensive subscription analytics',
    type: SubscriptionAnalyticsDTO,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({ 
    description: 'Forbidden - Only admins can access analytics',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 403 }
      }
    }
  })
  async getAnalytics(
    @Request() req: Request & { user: Omit<PayloadDTO, 'password'> },
  ): Promise<SubscriptionAnalyticsDTO> {
    const requestingUser = req.user;
    return this.subscriptionService.getAnalytics();
  }
}

