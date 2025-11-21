import {
  BadRequestException,
  Body,
  Controller,
  Delete,
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
} from '@nestjs/swagger';
import { SubscriptionService } from './subscription.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CreateSubscriptionDTO } from './dto/create-subscription.dto';
import { UpdateSubscriptionDTO } from './dto/update-subscription.dto';
import { JoinSubscriptionDTO } from './dto/join-subscription.dto';
import { UpdateRetailerSubscriptionDTO } from './dto/update-retailer-subscription.dto';
import { SubscriptionAnalyticsDTO } from './dto/subscription-analytics.dto';
import { Subscription, SubscriptionStatus, UserRole } from 'generated/prisma';
import { PayloadDTO } from 'src/auth/dto/payload.dto';

@ApiTags('Subscriptions')
@Controller('subscription')
export class SubscriptionController {
  constructor(private subscriptionService: SubscriptionService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'List subscriptions' })
  @ApiQuery({
    name: 'userId',
    required: false,
    type: Number,
    description: 'Filter by user ID',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: SubscriptionStatus,
    description: 'Filter by subscription status',
  })
  @ApiQuery({
    name: 'skip',
    required: false,
    type: Number,
    description: 'Number of records to skip',
  })
  @ApiQuery({
    name: 'take',
    required: false,
    type: Number,
    description: 'Number of records to take',
  })
  @ApiOkResponse({ description: 'Returns list of subscriptions' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async findManySubscriptions(
    @Request() req: Request & { user: Omit<PayloadDTO, 'password'> },
    @Query('userId') userId?: string,
    @Query('status') status?: SubscriptionStatus,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ): Promise<Subscription[]> {
    const requestingUser = req.user;
    const skipNum = skip ? parseInt(skip, 10) : undefined;
    const takeNum = take ? parseInt(take, 10) : undefined;
    const userIdNum = userId ? parseInt(userId, 10) : undefined;

    // Validate pagination parameters
    if (skipNum !== undefined && (isNaN(skipNum) || skipNum < 0)) {
      throw new BadRequestException('Skip must be a non-negative number');
    }
    if (takeNum !== undefined && (isNaN(takeNum) || takeNum <= 0)) {
      throw new BadRequestException('Take must be a positive number');
    }

    // Non-admin users can only see their own subscriptions
    const where: any = {};
    if (requestingUser.role !== UserRole.ADMIN) {
      where.userId = requestingUser.sub;
    } else if (userIdNum) {
      where.userId = userIdNum;
    }

    if (status) {
      where.status = status;
    }

    return this.subscriptionService.subscriptions({
      skip: skipNum,
      take: takeNum,
      where,
      orderBy: { createdAt: 'desc' },
      include: { user: true },
    });
  }

  @Get('user/:userId/active')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Get active subscription for a user' })
  @ApiParam({
    name: 'userId',
    required: true,
    description: 'User ID',
    type: Number,
  })
  @ApiOkResponse({ description: 'Returns the active subscription' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async getActiveSubscription(
    @Request() req: Request & { user: Omit<PayloadDTO, 'password'> },
    @Param('userId') userId: string,
  ): Promise<Subscription | null> {
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
      throw new UnauthorizedException(
        'You are not authorized to view this subscription',
      );
    }

    return this.subscriptionService.getActiveSubscription(userIdNum);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Get subscription by id' })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'Subscription ID',
    type: Number,
  })
  @ApiOkResponse({ description: 'Returns a subscription' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
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
      include: { user: true },
    });

    if (!subscription) {
      return null;
    }

    // Non-admin users can only see their own subscriptions
    if (
      requestingUser.role !== UserRole.ADMIN &&
      subscription.userId !== requestingUser.sub
    ) {
      throw new UnauthorizedException(
        'You are not authorized to view this subscription',
      );
    }

    return subscription;
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Create a subscription' })
  @ApiBody({ type: CreateSubscriptionDTO })
  @ApiOkResponse({ description: 'Subscription created successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiBadRequestResponse({ description: 'Invalid input' })
  async createSubscription(
    @Request() req: Request & { user: Omit<PayloadDTO, 'password'> },
    @Body() createSubscriptionDTO: CreateSubscriptionDTO,
  ): Promise<Subscription> {
    const requestingUser = req.user;
    const { userId, ...subscriptionParams } = createSubscriptionDTO;

    // Non-admin users can only create subscriptions for themselves
    if (
      requestingUser.role !== UserRole.ADMIN &&
      userId !== requestingUser.sub
    ) {
      throw new UnauthorizedException(
        'You are not authorized to create subscriptions for other users',
      );
    }

    const data: any = {
      ...subscriptionParams,
      user: {
        connect: {
          id: userId,
        },
      },
    };

    // Convert date strings to Date objects if provided
    if (subscriptionParams.startsAt) {
      data.startsAt = new Date(subscriptionParams.startsAt);
    }
    if (subscriptionParams.endsAt) {
      data.endsAt = new Date(subscriptionParams.endsAt);
    }

    return this.subscriptionService.create({ data });
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Update a subscription' })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'Subscription ID',
    type: Number,
  })
  @ApiBody({ type: UpdateSubscriptionDTO })
  @ApiOkResponse({ description: 'Subscription updated successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiBadRequestResponse({ description: 'Invalid input' })
  async updateSubscription(
    @Request() req: Request & { user: Omit<PayloadDTO, 'password'> },
    @Param('id') id: string,
    @Body() updateSubscriptionDTO: UpdateSubscriptionDTO,
  ): Promise<Subscription> {
    const requestingUser = req.user;
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

    // Non-admin users can only update their own subscriptions
    if (
      requestingUser.role !== UserRole.ADMIN &&
      existingSubscription.userId !== requestingUser.sub
    ) {
      throw new UnauthorizedException(
        'You are not authorized to update this subscription',
      );
    }

    const data: any = { ...updateSubscriptionDTO };

    // Convert date strings to Date objects if provided
    if (updateSubscriptionDTO.startsAt) {
      data.startsAt = new Date(updateSubscriptionDTO.startsAt);
    }
    if (updateSubscriptionDTO.endsAt) {
      data.endsAt = new Date(updateSubscriptionDTO.endsAt);
    }
    if (updateSubscriptionDTO.cancelledAt) {
      data.cancelledAt = new Date(updateSubscriptionDTO.cancelledAt);
    }

    return this.subscriptionService.update({
      where: { id: subscriptionId },
      data,
    });
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Delete a subscription' })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'Subscription ID',
    type: Number,
  })
  @ApiOkResponse({ description: 'Subscription deleted successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async deleteSubscription(
    @Request() req: Request & { user: Omit<PayloadDTO, 'password'> },
    @Param('id') id: string,
  ): Promise<Subscription> {
    const requestingUser = req.user;
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

    // Non-admin users can only delete their own subscriptions
    if (
      requestingUser.role !== UserRole.ADMIN &&
      existingSubscription.userId !== requestingUser.sub
    ) {
      throw new UnauthorizedException(
        'You are not authorized to delete this subscription',
      );
    }

    return this.subscriptionService.delete({ where: { id: subscriptionId } });
  }

  @Post('retailer/join')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Join a subscription (Retailer only)',
    description:
      'Retailers can join a subscription by ID. If they already have an active subscription, it will be cancelled first.',
  })
  @ApiBody({ type: JoinSubscriptionDTO })
  @ApiOkResponse({ description: 'Subscription joined successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized or not a retailer' })
  @ApiBadRequestResponse({ description: 'Invalid input or subscription not found' })
  async joinSubscription(
    @Request() req: Request & { user: Omit<PayloadDTO, 'password'> },
    @Body() joinSubscriptionDTO: JoinSubscriptionDTO,
  ): Promise<Subscription> {
    const requestingUser = req.user;

    // Only retailers can join subscriptions
    if (requestingUser.role !== UserRole.RETAILER) {
      throw new UnauthorizedException(
        'Only retailers can join subscriptions',
      );
    }

    if (!joinSubscriptionDTO.subscriptionId || Number.isNaN(joinSubscriptionDTO.subscriptionId)) {
      throw new BadRequestException('Invalid subscription ID');
    }

    return this.subscriptionService.joinSubscription(
      requestingUser.sub,
      joinSubscriptionDTO.subscriptionId,
    );
  }

  @Patch('retailer/update')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Update current subscription (Retailer only)',
    description:
      'Retailers can update their active subscription to a different subscription plan by ID.',
  })
  @ApiBody({ type: UpdateRetailerSubscriptionDTO })
  @ApiOkResponse({ description: 'Subscription updated successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized or not a retailer' })
  @ApiBadRequestResponse({ description: 'No active subscription found or subscription not found' })
  async updateRetailerSubscription(
    @Request() req: Request & { user: Omit<PayloadDTO, 'password'> },
    @Body() updateRetailerSubscriptionDTO: UpdateRetailerSubscriptionDTO,
  ): Promise<Subscription> {
    const requestingUser = req.user;

    // Only retailers can update their subscriptions
    if (requestingUser.role !== UserRole.RETAILER) {
      throw new UnauthorizedException(
        'Only retailers can update their subscriptions',
      );
    }

    if (!updateRetailerSubscriptionDTO.subscriptionId || Number.isNaN(updateRetailerSubscriptionDTO.subscriptionId)) {
      throw new BadRequestException('Invalid subscription ID');
    }

    return this.subscriptionService.updateRetailerSubscription(
      requestingUser.sub,
      updateRetailerSubscriptionDTO.subscriptionId,
    );
  }

  @Post('retailer/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Cancel current subscription (Retailer only)',
    description:
      'Retailers can cancel their active subscription. The subscription status will be set to CANCELLED.',
  })
  @ApiOkResponse({ description: 'Subscription cancelled successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized or not a retailer' })
  @ApiBadRequestResponse({ description: 'No active subscription found' })
  async cancelRetailerSubscription(
    @Request() req: Request & { user: Omit<PayloadDTO, 'password'> },
  ): Promise<Subscription> {
    const requestingUser = req.user;

    // Only retailers can cancel their subscriptions
    if (requestingUser.role !== UserRole.RETAILER) {
      throw new UnauthorizedException(
        'Only retailers can cancel their subscriptions',
      );
    }

    return this.subscriptionService.cancelRetailerSubscription(
      requestingUser.sub,
    );
  }

  @Get('admin/analytics')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Get subscription analytics (Admin only)',
    description:
      'Returns comprehensive subscription analytics including counts by status, plan, billing cycle, revenue metrics, and trends.',
  })
  @ApiOkResponse({
    description: 'Returns subscription analytics',
    type: SubscriptionAnalyticsDTO,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized or not an admin' })
  async getAnalytics(
    @Request() req: Request & { user: Omit<PayloadDTO, 'password'> },
  ): Promise<SubscriptionAnalyticsDTO> {
    const requestingUser = req.user;

    // Only admins can access analytics
    if (requestingUser.role !== UserRole.ADMIN) {
      throw new UnauthorizedException(
        'Only admins can access subscription analytics',
      );
    }

    return this.subscriptionService.getAnalytics();
  }
}

