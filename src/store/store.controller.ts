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
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiCreatedResponse,
  ApiResponse,
} from '@nestjs/swagger';
import { StoreService } from './store.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CreateStoreDTO } from './dto/createStore.dto';
import { UpdateStoreDTO } from './dto/updateStore.dto';
import { ManageStoreStatusDTO } from './dto/manageStoreStatus.dto';
import { StoreResponseDto, StoreWithDistanceResponseDto } from './dto/store-response.dto';
import { Prisma, UserRole } from 'generated/prisma';
import { PayloadDTO } from 'src/auth/dto/payload.dto';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { RolesGuard } from 'src/auth/roles.guard';

/**
 * Store Controller
 * 
 * Handles HTTP requests for store management operations.
 * Provides endpoints for creating, reading, updating, and deleting stores,
 * as well as location-based store searches.
 * 
 * Access Control:
 * - All users can view stores
 * - Only retailers and admins can create/update/delete stores
 * - Retailers can only manage their own stores
 * - Admins can manage any store and control verification status
 */
@ApiTags('Stores')
@Controller('store')
export class StoreController {
  constructor(private storeService: StoreService) {}

  /**
   * Retrieves a paginated list of stores with optional search.
   * 
   * Supports searching by store name or description (case-insensitive partial match)
   * and pagination using skip and take parameters.
   * 
   * @param search - Optional search term to filter stores by name or description
   * @param skip - Number of records to skip for pagination
   * @param take - Number of records to return
   * @returns Array of store objects matching the criteria
   * @throws {BadRequestException} If pagination parameters are invalid
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ 
    summary: 'List stores',
    description: 'Retrieves a paginated list of stores. Supports optional search by name or description (case-insensitive partial match).'
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search stores by name or description (case-insensitive partial match)',
    example: 'electronics'
  })
  @ApiQuery({
    name: 'skip',
    required: false,
    type: Number,
    description: 'Number of records to skip for pagination',
    example: 0
  })
  @ApiQuery({
    name: 'take',
    required: false,
    type: Number,
    description: 'Number of records to return',
    example: 10
  })
  @ApiOkResponse({ 
    description: 'Returns paginated list of stores',
    type: [StoreResponseDto]
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
  async findManyStores(
    @Query('search') search?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const skipNum = skip ? parseInt(skip, 10) : undefined;
    const takeNum = take ? parseInt(take, 10) : undefined;
    const searchQuery = search && search.length > 0 ? search : undefined;

    // Validate pagination parameters
    if (skipNum !== undefined && (isNaN(skipNum) || skipNum < 0)) {
      throw new BadRequestException('Skip must be a non-negative number');
    }
    if (takeNum !== undefined && (isNaN(takeNum) || takeNum <= 0)) {
      throw new BadRequestException('Take must be a positive number');
    }

    return this.storeService.stores({
      skip: skipNum,
      take: takeNum,
      where: searchQuery
        ? {
            OR: [
              {
                name: {
                  contains: searchQuery,
                  mode: 'insensitive',
                },
              },
              {
                description: {
                  contains: searchQuery,
                  mode: 'insensitive',
                },
              },
            ],
          }
        : undefined,
    });
  }

  /**
   * Finds stores near a specific location.
   * 
   * Uses the Haversine formula to calculate distances and returns stores
   * within the specified radius, sorted by distance (closest first).
   * Maximum 50 results are returned.
   * 
   * @param latitude - Latitude of the search center point (-90 to 90)
   * @param longitude - Longitude of the search center point (-180 to 180)
   * @param radius - Search radius in kilometers (default: 10km)
   * @returns Array of stores with calculated distance field (in km), sorted by proximity
   */
  @Get('nearby')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Find stores near a location',
    description:
      'Returns stores within a specified radius of the given coordinates, sorted by distance. Uses the Haversine formula to calculate distances in kilometers. Maximum 50 results.'
  })
  @ApiQuery({
    name: 'latitude',
    required: true,
    type: Number,
    description: 'Latitude of the search center point (decimal degrees, -90 to 90)',
    example: 10.3157,
    minimum: -90,
    maximum: 90
  })
  @ApiQuery({
    name: 'longitude',
    required: true,
    type: Number,
    description: 'Longitude of the search center point (decimal degrees, -180 to 180)',
    example: 123.8854,
    minimum: -180,
    maximum: 180
  })
  @ApiQuery({
    name: 'radius',
    required: false,
    type: Number,
    description: 'Search radius in kilometers (default: 10km, max: 50 results)',
    example: 5,
    minimum: 0
  })
  @ApiOkResponse({
    description:
      'Returns array of stores with calculated distance field (in km), ordered by proximity',
    type: [StoreWithDistanceResponseDto]
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiBadRequestResponse({ 
    description: 'Invalid coordinates or radius',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string' }
      }
    }
  })
  findNearby(
    @Query('latitude') latitude: string,
    @Query('longitude') longitude: string,
    @Query('radius') radius?: string,
  ) {
    return this.storeService.findNearby(
      parseFloat(latitude),
      parseFloat(longitude),
      radius ? parseFloat(radius) : 10,
    );
  }

  /**
   * Retrieves a single store by its ID.
   * 
   * @param id - Store ID
   * @returns Store object or null if not found
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ 
    summary: 'Get store by id',
    description: 'Retrieves detailed information about a specific store by its ID.'
  })
  @ApiParam({ 
    name: 'id', 
    type: Number,
    description: 'Store ID',
    example: 1
  })
  @ApiOkResponse({ 
    description: 'Returns store details. May return null if store not found (status 200 with null body).',
    type: StoreResponseDto
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  async findUniqueStore(@Param('id') id: string) {
    return this.storeService.store({ where: { id: Number(id) } });
  }

  /**
   * Creates a new store.
   * 
   * Retailers can only create stores for their own account (ownerId must match their user ID).
   * Admins can create stores for any user. After creation, notifications are sent to
   * the retailer (store under review) and all admins (new store created).
   * 
   * @param req - Request object containing authenticated user information
   * @param createStoreDTO - Store creation data
   * @returns Created store object
   * @throws {ForbiddenException} If retailer tries to create store for another user
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ 
    summary: 'Create a store',
    description: 'Creates a new store. Retailers can only create stores for their own account. Admins can create stores for any user. Store will be set to UNVERIFIED status initially.'
  })
  @ApiBody({ type: CreateStoreDTO })
  @ApiCreatedResponse({ 
    description: 'Store created successfully',
    type: StoreResponseDto
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({ 
    description: 'Forbidden - Retailer cannot create store for another user',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 403 },
        message: { type: 'string', example: 'Retailers can only create stores for their own account' }
      }
    }
  })
  @Roles(UserRole.RETAILER, UserRole.ADMIN)
  async createStore(
    @Request() req: Request & { user: Omit<PayloadDTO, 'password'> },
    @Body() createStoreDTO: CreateStoreDTO,
  ) {
    const { ownerId, ...storeParams } = createStoreDTO;
    const requestingUser = req.user;

    if (
      requestingUser.role === UserRole.RETAILER &&
      ownerId !== requestingUser.sub
    ) {
      throw new ForbiddenException(
        'Retailers can only create stores for their own account',
      );
    }

    return this.storeService.create({
      data: {
        ...storeParams,
        owner: {
          connect: {
            id: ownerId,
          },
        },
      },
    });
  }

  /**
   * Updates an existing store.
   * 
   * Retailers can only update their own stores. Admins can update any store.
   * 
   * @param req - Request object containing authenticated user information
   * @param id - Store ID to update
   * @param updateStoreDTO - Store update data (all fields optional)
   * @returns Updated store object
   * @throws {BadRequestException} If store ID is invalid or store not found
   * @throws {ForbiddenException} If retailer tries to update another user's store
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ 
    summary: 'Update a store',
    description: 'Updates store information. Retailers can only update their own stores. Admins can update any store.'
  })
  @ApiParam({ 
    name: 'id', 
    type: Number,
    description: 'Store ID to update',
    example: 1
  })
  @ApiBody({ type: UpdateStoreDTO })
  @ApiOkResponse({ 
    description: 'Store updated successfully',
    type: StoreResponseDto
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiBadRequestResponse({ 
    description: 'Invalid store ID or store not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Invalid store id' }
      }
    }
  })
  @ApiForbiddenResponse({ 
    description: 'Forbidden - Retailer cannot update another user\'s store',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 403 },
        message: { type: 'string', example: 'Retailers can only update their own stores' }
      }
    }
  })
  @Roles(UserRole.RETAILER, UserRole.ADMIN)
  async updateStore(
    @Request() req: Request & { user: Omit<PayloadDTO, 'password'> },
    @Param('id') id: string,
    @Body() updateStoreDTO: UpdateStoreDTO,
  ) {
    const requestingUser = req.user;
    const storeId = Number(id);

    if (!storeId || Number.isNaN(storeId)) {
      throw new BadRequestException('Invalid store id');
    }

    if (requestingUser.role === UserRole.RETAILER) {
      const existingStore = await this.storeService.store({
        where: { id: storeId },
      });

      if (!existingStore) {
        throw new BadRequestException('Store not found');
      };

      if (existingStore.ownerId !== requestingUser.sub) {
        throw new ForbiddenException(
          'Retailers can only update their own stores',
        );
      }
    }

    const { ownerId, ...storeParams } = updateStoreDTO;

    return this.storeService.update({
      where: { id: storeId },
      data: {
        ...storeParams,
        owner: ownerId
          ? {
              connect: {
                id: ownerId,
              },
            }
          : undefined,
      },
    });
  }

  /**
   * Updates store verification status and active status (Admin only).
   * 
   * Allows admins to verify stores and activate/deactivate them.
   * At least one of verificationStatus or isActive must be provided.
   * 
   * @param req - Request object containing authenticated admin user information
   * @param id - Store ID to update
   * @param manageStoreStatusDTO - Status update data
   * @returns Updated store object
   * @throws {BadRequestException} If store ID is invalid or no status fields provided
   * @throws {ForbiddenException} If user is not an admin
   */
  @Patch(':id/admin-status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('bearer')
  @ApiOperation({ 
    summary: 'Admin: manage store verification / active status',
    description: 'Updates store verification status and/or active status. Restricted to admins only. At least one status field must be provided.'
  })
  @ApiParam({ 
    name: 'id', 
    type: Number,
    description: 'Store ID to update',
    example: 1
  })
  @ApiBody({ type: ManageStoreStatusDTO })
  @ApiOkResponse({ 
    description: 'Store status updated successfully',
    type: StoreResponseDto
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({ 
    description: 'Forbidden - Only admins can manage store status',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 403 },
        message: { type: 'string', example: 'Only admins can manage store verification or status' }
      }
    }
  })
  @ApiBadRequestResponse({ 
    description: 'Invalid store ID or no status fields provided',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Provide verificationStatus or isActive to update' }
      }
    }
  })
  async updateStoreAdminStatus(
    @Request() req: Request & { user: Omit<PayloadDTO, 'password'> },
    @Param('id') id: string,
    @Body() manageStoreStatusDTO: ManageStoreStatusDTO,
  ) {
    const requestingUser = req.user;
    const storeId = Number(id);

    if (!storeId || Number.isNaN(storeId)) {
      throw new BadRequestException('Invalid store id');
    }

    if (requestingUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'Only admins can manage store verification or status',
      );
    }
    const data: Prisma.StoreUpdateInput = {};

    if (manageStoreStatusDTO.verificationStatus) {
      data.verificationStatus = manageStoreStatusDTO.verificationStatus;
    }

    if (typeof manageStoreStatusDTO.isActive === 'boolean') {
      data.isActive = manageStoreStatusDTO.isActive;
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException(
        'Provide verificationStatus or isActive to update',
      );
    }

    return this.storeService.update({
      where: { id: storeId },
      data,
    });
  }

  /**
   * Deletes a store.
   * 
   * Retailers can only delete their own stores. Admins can delete any store.
   * This operation is permanent and cannot be undone.
   * 
   * @param req - Request object containing authenticated user information
   * @param id - Store ID to delete
   * @returns Deleted store object
   * @throws {BadRequestException} If store ID is invalid or store not found
   * @throws {ForbiddenException} If retailer tries to delete another user's store
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ 
    summary: 'Delete a store',
    description: 'Permanently deletes a store. Retailers can only delete their own stores. Admins can delete any store. This operation cannot be undone.'
  })
  @ApiParam({ 
    name: 'id', 
    type: Number,
    description: 'Store ID to delete',
    example: 1
  })
  @ApiOkResponse({ 
    description: 'Store deleted successfully',
    type: StoreResponseDto
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiBadRequestResponse({ 
    description: 'Invalid store ID or store not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Invalid store id' }
      }
    }
  })
  @ApiForbiddenResponse({ 
    description: 'Forbidden - Retailer cannot delete another user\'s store',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 403 },
        message: { type: 'string', example: 'Retailers can only delete their own stores' }
      }
    }
  })
  @Roles(UserRole.RETAILER, UserRole.ADMIN)
  async deleteStore(
    @Request() req: Request & { user: Omit<PayloadDTO, 'password'> },
    @Param('id') id: string,
  ) {
    const requestingUser = req.user;
    const storeId = Number(id);

    if (!storeId || Number.isNaN(storeId)) {
      throw new BadRequestException('Invalid store id');
    }

    if (requestingUser.role === UserRole.RETAILER) {
      const existingStore = await this.storeService.store({
        where: { id: storeId },
      });

      if (!existingStore) {
        throw new BadRequestException('Store not found');
      }

      if (existingStore.ownerId !== requestingUser.sub) {
        throw new ForbiddenException(
          'Retailers can only delete their own stores',
        );
      }
    }

    return this.storeService.delete({
      where: { id: storeId },
    });
  }
}
