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
import {
  Prisma,
  Subscription,
  SubscriptionStatus,
  SubscriptionPlan,
  UserRole,
  UserSubscription,
} from 'generated/prisma';
import { PayloadDTO } from 'src/auth/dto/payload.dto';

@ApiTags('Subscriptions')
@Controller('subscription')
export class SubscriptionController {
  constructor(private subscriptionService: SubscriptionService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'List subscription plans' })
  @ApiQuery({
    name: 'plan',
    required: false,
    enum: SubscriptionPlan,
    description: 'Filter by subscription plan type',
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    type: Boolean,
    description: 'Filter by availability status (admin only)',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by subscription name or description (admin only)',
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
  @ApiOkResponse({ description: 'Returns list of subscription plans' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
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
  @ApiOkResponse({ description: 'Returns the active user subscription' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
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
      throw new UnauthorizedException(
        'You are not authorized to view this subscription',
      );
    }

    return this.subscriptionService.getActiveUserSubscription(userIdNum);
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
    });

    if (!subscription) {
      return null;
    }

    if (!subscription.isActive && requestingUser.role !== UserRole.ADMIN) {
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
  ): Promise<UserSubscription> {
    const requestingUser = req.user;
    if (requestingUser.role !== UserRole.ADMIN) {
      throw new UnauthorizedException(
        'Only admins can create subscription plans',
      );
    }

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
  ): Promise<UserSubscription> {
    const requestingUser = req.user;
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

    if (requestingUser.role !== UserRole.ADMIN) {
      throw new UnauthorizedException(
        'Only admins can update subscription plans',
      );
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

    if (requestingUser.role !== UserRole.ADMIN) {
      throw new UnauthorizedException(
        'Only admins can delete subscription plans',
      );
    }

    return this.subscriptionService.deletePlan({
      where: { id: subscriptionId },
    });
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
  ): Promise<UserSubscription> {
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

