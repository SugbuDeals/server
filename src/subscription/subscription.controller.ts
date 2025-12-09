import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiBadRequestResponse,
  ApiCreatedResponse,
} from '@nestjs/swagger';
import { SubscriptionService } from './subscription.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { SubscriptionTierResponseDto } from './dto/subscription-tier-response.dto';
import { SubscriptionAnalyticsDto } from './dto/subscription-analytics.dto';
import { UserRole } from 'generated/prisma';
import { PayloadDTO } from 'src/auth/dto/payload.dto';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { RolesGuard } from 'src/auth/roles.guard';

/**
 * Subscription Controller
 * 
 * Handles HTTP requests for fixed subscription tier management.
 * Provides endpoints for upgrading/downgrading between BASIC and PRO tiers.
 * 
 * Access Control:
 * - All authenticated users can view their own tier
 * - Consumers and retailers can upgrade/downgrade their tier
 * - Only admins can view analytics
 * 
 * Tier Pricing:
 * - BASIC: Free (default)
 * - PRO: 100 PHP per month
 */
@ApiTags('Subscriptions')
@Controller('subscription')
export class SubscriptionController {
  constructor(private subscriptionService: SubscriptionService) {}

  /**
   * Get current user's subscription tier.
   * 
   * Returns the authenticated user's current subscription tier (BASIC or PRO)
   * along with their role and basic information.
   * 
   * @param req - Request object containing authenticated user information
   * @returns Current subscription tier information
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Get current user subscription tier',
    description: 'Retrieves the authenticated user\'s current subscription tier (BASIC or PRO) along with role information.',
  })
  @ApiOkResponse({
    description: 'Returns current subscription tier information',
    type: SubscriptionTierResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  async getCurrentTier(
    @Request() req: Request & { user: Omit<PayloadDTO, 'password'> },
  ): Promise<SubscriptionTierResponseDto> {
    const requestingUser = req.user;
    return this.subscriptionService.getCurrentTier(requestingUser.sub);
  }

  /**
   * Upgrade to PRO tier.
   * 
   * Upgrades the authenticated user from BASIC to PRO tier.
   * PRO tier provides:
   * - Consumers: 3km radius (vs 1km for BASIC)
   * - Retailers: Unlimited products, promotions, and products per promotion
   * 
   * Cost: 100 PHP per month
   * 
   * @param req - Request object containing authenticated user information
   * @returns Updated user information with PRO tier
   * @throws {BadRequestException} If user is already on PRO tier
   */
  @Post('upgrade')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CONSUMER, UserRole.RETAILER)
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Upgrade to PRO tier',
    description: 'Upgrades the user from BASIC to PRO tier. PRO costs 100 PHP/month and provides extended limits. Restricted to consumers and retailers.',
  })
  @ApiCreatedResponse({
    description: 'Successfully upgraded to PRO tier',
    type: SubscriptionTierResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({
    description: 'Forbidden - Only consumers and retailers can upgrade',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 403 },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'User already has PRO tier',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'User already has PRO tier' },
      },
    },
  })
  async upgradeToPro(
    @Request() req: Request & { user: Omit<PayloadDTO, 'password'> },
  ) {
    const requestingUser = req.user;
    return this.subscriptionService.upgradeToPro(requestingUser.sub);
  }

  /**
   * Downgrade to BASIC tier.
   * 
   * Downgrades the authenticated user from PRO to BASIC tier.
   * This will apply tier limits:
   * - Consumers: 1km radius
   * - Retailers: 10 products max, 5 promotions max, 10 products per promotion max
   * 
   * @param req - Request object containing authenticated user information
   * @returns Updated user information with BASIC tier
   * @throws {BadRequestException} If user is already on BASIC tier
   */
  @Post('downgrade')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CONSUMER, UserRole.RETAILER)
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Downgrade to BASIC tier',
    description: 'Downgrades the user from PRO to BASIC tier. BASIC tier has limited features. Restricted to consumers and retailers.',
  })
  @ApiCreatedResponse({
    description: 'Successfully downgraded to BASIC tier',
    type: SubscriptionTierResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({
    description: 'Forbidden - Only consumers and retailers can downgrade',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 403 },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'User already has BASIC tier',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'User already has BASIC tier' },
      },
    },
  })
  async downgradeToBasic(
    @Request() req: Request & { user: Omit<PayloadDTO, 'password'> },
  ) {
    const requestingUser = req.user;
    return this.subscriptionService.downgradeToBasic(requestingUser.sub);
  }

  /**
   * Get subscription analytics (Admin only).
   * 
   * Returns comprehensive analytics about subscription tier distribution:
   * - Total users by tier
   * - Distribution by role and tier
   * - Revenue metrics (PRO tier costs 100 PHP per month)
   * 
   * @param req - Request object containing authenticated admin user information
   * @returns Subscription analytics data
   */
  @Get('analytics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Get subscription analytics (Admin only)',
    description: 'Returns comprehensive subscription tier analytics including user counts by tier/role and revenue metrics.',
  })
  @ApiOkResponse({
    description: 'Returns subscription analytics',
    type: SubscriptionAnalyticsDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({
    description: 'Forbidden - Only admins can access analytics',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 403 },
      },
    },
  })
  async getAnalytics(
    @Request() req: Request & { user: Omit<PayloadDTO, 'password'> },
  ): Promise<SubscriptionAnalyticsDto> {
    return this.subscriptionService.getAnalytics();
  }
}
