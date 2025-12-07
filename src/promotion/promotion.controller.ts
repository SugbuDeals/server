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
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { RolesGuard } from 'src/auth/roles.guard';
import { UserRole } from 'generated/prisma';

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
   * Creates a new promotion.
   * 
   * After creation, automatically notifies users who bookmarked the product/store
   * and checks for questionable discount pricing.
   * 
   * @param createPromotionDto - Promotion creation data
   * @returns Created promotion object
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ 
    summary: 'Create a promotion',
    description: 'Creates a new promotion for a product. Restricted to retailers and admins. Automatically notifies bookmarks and checks for questionable pricing.'
  })
  @ApiBody({ type: CreatePromotionDto })
  @ApiCreatedResponse({ 
    description: 'Promotion created successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number' },
        title: { type: 'string' },
        discount: { type: 'number' },
        active: { type: 'boolean' }
      }
    }
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({ 
    description: 'Forbidden - Only retailers and admins can create promotions',
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
  @Roles(UserRole.ADMIN, UserRole.RETAILER)
  create(@Body() createPromotionDto: CreatePromotionDto) {
    return this.promotionService.create(createPromotionDto);
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
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'number' },
          title: { type: 'string' },
          discount: { type: 'number' },
          active: { type: 'boolean' },
          startsAt: { type: 'string', format: 'date-time' },
          endsAt: { type: 'string', format: 'date-time', nullable: true }
        }
      }
    }
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
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'number' },
          title: { type: 'string' },
          discount: { type: 'number' },
          active: { type: 'boolean', example: true },
          startsAt: { type: 'string', format: 'date-time' },
          endsAt: { type: 'string', format: 'date-time', nullable: true }
        }
      }
    }
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
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number' },
        title: { type: 'string' },
        type: { type: 'string' },
        description: { type: 'string' },
        discount: { type: 'number' },
        active: { type: 'boolean' },
        startsAt: { type: 'string', format: 'date-time' },
        endsAt: { type: 'string', format: 'date-time', nullable: true },
        productId: { type: 'number', nullable: true }
      }
    }
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
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number' },
        title: { type: 'string' },
        discount: { type: 'number' }
      }
    }
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
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number' },
        title: { type: 'string' }
      }
    }
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
