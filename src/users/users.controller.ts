import {
  Controller,
  Delete,
  Param,
  UseGuards,
  ForbiddenException,
  UnauthorizedException,
  Request,
  Get,
  Query,
  Patch,
  Body,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
  ApiOperation,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Prisma, User, UserRole } from 'generated/prisma';
import { PayloadDTO } from 'src/auth/dto/payload.dto';
import { UpdateUserDTO } from './dto/updateUser.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { RolesGuard } from 'src/auth/roles.guard';

/**
 * Users Controller
 * 
 * Handles HTTP requests for user management operations.
 * Provides endpoints for retrieving, updating, and deleting user accounts.
 * 
 * Access Control:
 * - Users can only view/update/delete their own account
 * - Admins can perform operations on any user account
 * - Admin-only endpoints are protected with RolesGuard
 */
@ApiTags('Users')
@Controller('user')
export class UserController {
  constructor(private userService: UsersService) {}
  private readonly logger = new Logger(UserController.name);

  /**
   * Retrieves the authenticated user's profile.
   * 
   * Returns the user information for the currently authenticated user
   * based on the JWT token. The user ID is extracted from the token payload.
   * 
   * @param req - Request object containing authenticated user information
   * @returns User object (excluding password) or null if not found
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Get current user profile',
    description: 'Returns the authenticated user\'s profile information based on the JWT token. The user ID is extracted from the token, so the :id parameter is ignored.'
  })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'User id (ignored, uses authenticated user ID from token)',
    type: Number,
  })
  @ApiOkResponse({ 
    description: 'Returns the authenticated user\'s profile. May return null if user not found (status 200 with null body).',
    type: UserResponseDto
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  async findUniqueUser(
    @Request() req: Request & { user: Omit<PayloadDTO, 'password'> },
  ): Promise<User | null> {
    return this.userService.user({ id: req.user.sub });
  }

  /**
   * Retrieves a list of users with optional filtering and pagination.
   * 
   * Supports filtering by email and name (case-insensitive partial match),
   * and pagination using skip and take parameters.
   * 
   * @param email - Optional email filter (partial match, case-insensitive)
   * @param name - Optional name filter (partial match, case-insensitive)
   * @param take - Number of records to return (default: 10)
   * @param skip - Number of records to skip for pagination (default: 0)
   * @returns Array of user objects matching the criteria
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'List users with optional filters',
    description: 'Retrieves a paginated list of users. Supports filtering by email and name (case-insensitive partial match). Results are ordered by creation date (newest first).'
  })
  @ApiQuery({ 
    name: 'email', 
    required: false, 
    type: String,
    description: 'Filter by email (partial match, case-insensitive)',
    example: 'example.com'
  })
  @ApiQuery({ 
    name: 'name', 
    required: false, 
    type: String,
    description: 'Filter by name (partial match, case-insensitive)',
    example: 'John'
  })
  @ApiQuery({ 
    name: 'take', 
    required: false, 
    type: Number,
    description: 'Number of records to return',
    example: 10
  })
  @ApiQuery({ 
    name: 'skip', 
    required: false, 
    type: Number,
    description: 'Number of records to skip for pagination',
    example: 0
  })
  @ApiOkResponse({ 
    description: 'Returns paginated list of users',
    type: [UserResponseDto]
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  async findManyUsers(
    @Query('email') email?: string,
    @Query('name') name?: string,
    @Query('take') take = '10',
    @Query('skip') skip = '0',
  ): Promise<User[]> {
    const where: any = {};

    if (email) {
      where.email = { contains: email, mode: 'insensitive' };
    }

    if (name) {
      where.name = { contains: name, mode: 'insensitive' };
    }

    return this.userService.users({
      where,
      take: parseInt(take),
      skip: parseInt(skip),
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Deletes a user account.
   * 
   * Users can only delete their own account. Admins can delete any account.
   * 
   * @param req - Request object containing authenticated user information
   * @param id - ID of the user to delete
   * @returns Deleted user object
   * @throws {ForbiddenException} If user tries to delete another user's account (unless admin)
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Delete a user account',
    description: 'Deletes a user account. Users can only delete their own account. Admins can delete any account.'
  })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'ID of the user to delete',
    type: Number,
    example: 1
  })
  @ApiOkResponse({ 
    description: 'User deleted successfully',
    type: UserResponseDto
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({ 
    description: 'Forbidden - User does not have permission to delete this account',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 403 },
        message: { type: 'string', example: 'You are not allowed to delete this user account' }
      }
    }
  })
  async deleteUser(
    @Request() req: Request & { user: Omit<PayloadDTO, 'password'> },
    @Param('id') id: string,
  ): Promise<User | null> {
    const userId = Number(id);
    const requestingUser = req.user;

    // Allow deletion if user is admin or if user is deleting their own account
    if (
      requestingUser.role === UserRole.ADMIN ||
      requestingUser.sub === userId
    ) {
      return this.userService.delete({ where: { id: userId } });
    }

    throw new ForbiddenException(
      'You are not allowed to delete this user account',
    );
  }

  /**
   * Updates a user account.
   * 
   * Users can only update their own account. Admins can update any account.
   * Only admins can change user roles. All other fields can be updated by the user.
   * 
   * @param req - Request object containing authenticated user information
   * @param id - ID of the user to update
   * @param body - Update data (all fields optional)
   * @returns Updated user object
   * @throws {BadRequestException} If user ID is invalid
   * @throws {ForbiddenException} If user tries to update another user's account (unless admin)
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Update a user account',
    description: 'Updates user information. Users can only update their own account. Admins can update any account. Only admins can change user roles.'
  })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'ID of the user to update',
    type: Number,
    example: 1
  })
  @ApiBody({ type: UpdateUserDTO })
  @ApiOkResponse({ 
    description: 'User updated successfully',
    type: UserResponseDto
  })
  @ApiBadRequestResponse({ 
    description: 'Invalid user ID or validation error',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Invalid user id' }
      }
    }
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({ 
    description: 'Forbidden - User does not have permission to update this account',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 403 },
        message: { type: 'string', example: 'You are not allowed to update this user account' }
      }
    }
  })
  async updateUser(
    @Request() req: Request & { user: Omit<PayloadDTO, 'password'> },
    @Param('id') id: string,
    @Body() body: UpdateUserDTO,
  ): Promise<User> {
    const userId = Number(id);
    const requestingUser = req.user;

    if (!userId || Number.isNaN(userId)) {
      throw new BadRequestException('Invalid user id');
    }

    if (
      requestingUser.role !== UserRole.ADMIN &&
      requestingUser.sub !== userId
    ) {
      throw new ForbiddenException(
        'You are not allowed to update this user account',
      );
    }

    const data: Prisma.UserUpdateInput = {};
    if (typeof body.name === 'string') data.name = body.name;
    if (typeof body.email === 'string') data.email = body.email;
    if (
      typeof body.role !== 'undefined' &&
      requestingUser.role === UserRole.ADMIN
    ) {
      data.role = body.role;
    }
    if (Object.prototype.hasOwnProperty.call(body, 'imageUrl')) {
      if (typeof body.imageUrl === 'string') {
        data.imageUrl = body.imageUrl;
      } else if (body.imageUrl === null) {
        data.imageUrl = null;
      }
    }

    return this.userService.update({ where: { id: userId }, data });
  }

  /**
   * Approves a retailer account (Admin only).
   * 
   * Changes a user's role to RETAILER. This endpoint is restricted to admins only.
   * Typically used to approve retailer registration requests.
   * 
   * @param req - Request object containing authenticated admin user information
   * @param id - ID of the user to approve as retailer
   * @returns Updated user object with RETAILER role
   * @throws {BadRequestException} If user ID is invalid
   * @throws {ForbiddenException} If user is not an admin
   */
  @Patch(':id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('bearer')
  @ApiOperation({ 
    summary: 'Admin: approve retailer account',
    description: 'Changes a user\'s role to RETAILER. This endpoint is restricted to admins only. Used to approve retailer registration requests.'
  })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'ID of the user to approve as retailer',
    type: Number,
    example: 1
  })
  @ApiOkResponse({ 
    description: 'Retailer approved successfully',
    type: UserResponseDto
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({ 
    description: 'Forbidden - Only admins can approve retailer accounts',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 403 },
        message: { type: 'string', example: 'Only admins can approve retailer accounts' }
      }
    }
  })
  @ApiBadRequestResponse({ 
    description: 'Invalid user ID',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Invalid user id' }
      }
    }
  })
  async approveRetailer(
    @Request() req: Request & { user: Omit<PayloadDTO, 'password'> },
    @Param('id') id: string,
  ): Promise<User> {
    const adminUser = req.user;
    const userId = Number(id);

    if (!userId || Number.isNaN(userId)) {
      throw new BadRequestException('Invalid user id');
    }

    if (adminUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'Only admins can approve retailer accounts',
      );
    }
    return this.userService.update({
      where: { id: userId },
      data: { role: UserRole.RETAILER },
    });
  }
}
