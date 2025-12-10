import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  UseGuards,
  Request as RequestDecorator,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiBadRequestResponse,
  ApiCreatedResponse,
} from '@nestjs/swagger';
import { PromotionService } from './promotion.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { PromotionResponseDto } from './dto/promotion-response.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { RolesGuard } from 'src/auth/roles.guard';
import { UserRole } from 'generated/prisma';
import { SubscriptionTierGuard } from 'src/subscription/guards/subscription-tier.guard';
import { TierLimit, TierLimitType } from 'src/subscription/decorators/tier-limit.decorator';
import { AddProductsToPromotionDto } from './dto/add-products-to-promotion.dto';
import type { Request as ExpressRequest } from 'express';
import { PayloadDTO } from 'src/auth/dto/payload.dto';

/**
 * Promotion Controller
 * 
 * Handles HTTP requests for promotion management operations.
 * Provides endpoints for creating, reading, updating, and deleting promotions.
 * 
 * Access Control:
 * - All authenticated users can view promotions
 * - Only retailers and admins can create/update/delete promotions
 */
@ApiTags('Promotions')
@Controller('promotions')
export class PromotionController {
  constructor(private readonly promotionService: PromotionService) {}

  /**
   * Creates a new promotion with multiple products.
   * 
   * After creation, automatically notifies users who bookmarked the products/stores
   * and checks for questionable discount pricing.
   * 
   * Subscription Tier Limits (Retailers only):
   * - BASIC: Maximum 5 promotions, max 10 products per promotion
   * - PRO: Unlimited promotions and products per promotion
   * 
   * @param req - Request object containing authenticated user information
   * @param createPromotionDto - Promotion creation data with product IDs
   * @returns Created promotion object
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard, SubscriptionTierGuard)
  @TierLimit(TierLimitType.RETAILER_PROMOTION_COUNT)
  @ApiBearerAuth('bearer')
  @ApiOperation({ 
    summary: 'Create a promotion',
    description: 'Creates a new promotion for multiple products. Restricted to retailers and admins. Automatically notifies bookmarks and checks for questionable pricing. TIER LIMITS (Retailers only): BASIC tier allows max 5 promotions and max 10 products per promotion, PRO tier allows unlimited.',
  })
  @ApiBody({ type: CreatePromotionDto })
  @ApiCreatedResponse({ 
    description: 'Promotion created successfully',
    type: PromotionResponseDto
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({ 
    description: 'Forbidden - Only retailers and admins can create promotions, or tier limit exceeded',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 403 },
        message: {
          type: 'string',
          examples: [
            'Only retailers and admins can create promotions',
            'BASIC tier allows a maximum of 5 promotions. Upgrade to PRO for unlimited promotions.',
            'BASIC tier allows a maximum of 10 products per promotion. Upgrade to PRO for unlimited products per promotion.',
          ],
        },
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
  @Roles(UserRole.ADMIN, UserRole.RETAILER)
  create(
    @RequestDecorator() req: ExpressRequest & { user: Omit<PayloadDTO, 'password'> },
    @Body() createPromotionDto: CreatePromotionDto,
  ) {
    const requestingUser = req.user;
    return this.promotionService.create(createPromotionDto, requestingUser.sub);
  }

  /**
   * Adds products to an existing promotion.
   * 
   * Checks subscription tier limits before adding products.
   * 
   * Subscription Tier Limits (Retailers only):
   * - BASIC: Maximum 10 products per promotion (total)
   * - PRO: Unlimited products per promotion
   * 
   * @param req - Request object containing authenticated user information
   * @param id - Promotion ID
   * @param addProductsDto - DTO containing product IDs to add
   * @returns Updated promotion object
   */
  @Post(':id/products')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Add products to a promotion',
    description: 'Adds additional products to an existing promotion. Restricted to retailers and admins. TIER LIMITS (Retailers only): BASIC tier allows max 10 products total per promotion, PRO tier allows unlimited.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Promotion ID',
    example: 1,
  })
  @ApiBody({ type: AddProductsToPromotionDto })
  @ApiCreatedResponse({
    description: 'Products added successfully',
    type: PromotionResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({
    description: 'Forbidden - Only retailers and admins can add products, or tier limit exceeded',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 403 },
        message: {
          type: 'string',
          example: 'BASIC tier allows a maximum of 10 products per promotion. Upgrade to PRO for unlimited products per promotion.',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid promotion ID or product IDs',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Promotion not found' },
      },
    },
  })
  @Roles(UserRole.ADMIN, UserRole.RETAILER)
  addProducts(
    @RequestDecorator() req: ExpressRequest & { user: Omit<PayloadDTO, 'password'> },
    @Param('id', ParseIntPipe) id: number,
    @Body() addProductsDto: AddProductsToPromotionDto,
  ) {
    const requestingUser = req.user;
    return this.promotionService.addProductsToPromotion(id, requestingUser.sub, addProductsDto);
  }

  /**
   * Retrieves a list of all promotions.
   * 
   * @returns Array of all promotion objects
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ 
    summary: 'List promotions',
    description: 'Retrieves a list of all promotions, including inactive and expired ones.'
  })
  @ApiOkResponse({ 
    description: 'Returns list of all promotions',
    type: [PromotionResponseDto]
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  findAll() {
    return this.promotionService.findAll();
  }

  /**
   * Retrieves a list of currently active promotions.
   * 
   * Active promotions are those that:
   * - Have active flag set to true
   * - Have started (startsAt <= now)
   * - Have not ended (endsAt is null or endsAt >= now)
   * 
   * @returns Array of active promotion objects
   */
  @Get('active')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ 
    summary: 'List active promotions',
    description: 'Retrieves only promotions that are currently active based on their start/end dates and active status.'
  })
  @ApiOkResponse({ 
    description: 'Returns list of active promotions',
    type: [PromotionResponseDto]
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  findActive() {
    return this.promotionService.findActive();
  }

  /**
   * Retrieves a single promotion by its ID.
   * 
   * @param id - Promotion ID
   * @returns Promotion object or null if not found
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ 
    summary: 'Get promotion by id',
    description: 'Retrieves detailed information about a specific promotion by its ID.'
  })
  @ApiParam({ 
    name: 'id', 
    type: Number,
    description: 'Promotion ID',
    example: 1
  })
  @ApiOkResponse({ 
    description: 'Returns promotion details',
    type: PromotionResponseDto
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.promotionService.findOne(id);
  }

  /**
   * Updates an existing promotion.
   * 
   * @param id - Promotion ID to update
   * @param updatePromotionDto - Promotion update data (all fields optional)
   * @returns Updated promotion object
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ 
    summary: 'Update a promotion',
    description: 'Updates promotion information. Restricted to retailers and admins.'
  })
  @ApiParam({ 
    name: 'id', 
    type: Number,
    description: 'Promotion ID to update',
    example: 1
  })
  @ApiBody({ type: UpdatePromotionDto })
  @ApiOkResponse({ 
    description: 'Promotion updated successfully',
    type: PromotionResponseDto
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({ 
    description: 'Forbidden - Only retailers and admins can update promotions',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 403 }
      }
    }
  })
  @ApiBadRequestResponse({ 
    description: 'Invalid promotion ID or validation error',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 }
      }
    }
  })
  @Roles(UserRole.ADMIN, UserRole.RETAILER)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePromotionDto: UpdatePromotionDto,
  ) {
    return this.promotionService.update(id, updatePromotionDto);
  }

  /**
   * Deletes a promotion.
   * 
   * This operation is permanent and cannot be undone.
   * 
   * @param id - Promotion ID to delete
   * @returns Deleted promotion object
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ 
    summary: 'Delete a promotion',
    description: 'Permanently deletes a promotion. Restricted to retailers and admins. This operation cannot be undone.'
  })
  @ApiParam({ 
    name: 'id', 
    type: Number,
    description: 'Promotion ID to delete',
    example: 1
  })
  @ApiOkResponse({ 
    description: 'Promotion deleted successfully',
    type: PromotionResponseDto
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({ 
    description: 'Forbidden - Only retailers and admins can delete promotions',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 403 }
      }
    }
  })
  @Roles(UserRole.ADMIN, UserRole.RETAILER)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.promotionService.remove(id);
  }
}
