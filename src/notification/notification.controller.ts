import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationResponseDto } from './dto/notification-response.dto';
import { PayloadDTO } from 'src/auth/dto/payload.dto';

/**
 * Notification Controller
 * 
 * Handles HTTP requests for notification management operations.
 * Provides endpoints for retrieving, creating, marking as read, and deleting notifications.
 * 
 * All endpoints are scoped to the authenticated user - users can only
 * manage their own notifications.
 */
@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('bearer')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  /**
   * Retrieves notifications for the authenticated user.
   * 
   * Supports filtering by read status and pagination.
   * Results are ordered by creation date (newest first).
   * 
   * @param req - Request object containing authenticated user information
   * @param skip - Number of records to skip for pagination
   * @param take - Number of records to return
   * @param read - Filter by read status (true for read, false for unread, undefined for all)
   * @returns Array of notification objects
   */
  @Get()
  @ApiOperation({ 
    summary: 'Get user notifications',
    description: 'Retrieves notifications for the authenticated user. Supports filtering by read status and pagination. Results are ordered by creation date (newest first).'
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
  @ApiQuery({ 
    name: 'read', 
    required: false, 
    type: Boolean,
    description: 'Filter by read status (true for read, false for unread, omit for all)',
    example: false
  })
  @ApiOkResponse({ 
    description: 'Returns paginated list of notifications',
    type: [NotificationResponseDto]
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  async getUserNotifications(
    @Request() req: Request & { user: Omit<PayloadDTO, 'password'> },
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('read') read?: string,
  ) {
    const userId = req.user.sub;
    return this.notificationService.getUserNotifications(userId, {
      skip: skip ? Number(skip) : undefined,
      take: take ? Number(take) : undefined,
      read: read !== undefined ? read === 'true' : undefined,
    });
  }

  /**
   * Gets the count of unread notifications for the authenticated user.
   * 
   * @param req - Request object containing authenticated user information
   * @returns Object containing the unread count
   */
  @Get('unread-count')
  @ApiOperation({ 
    summary: 'Get unread notification count',
    description: 'Returns the total count of unread notifications for the authenticated user.'
  })
  @ApiOkResponse({ 
    description: 'Returns unread notification count',
    schema: {
      type: 'object',
      properties: {
        count: { type: 'number', example: 5 }
      }
    }
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  async getUnreadCount(
    @Request() req: Request & { user: Omit<PayloadDTO, 'password'> },
  ) {
    const userId = req.user.sub;
    return this.notificationService.getUnreadCount(userId);
  }

  /**
   * Creates a new notification.
   * 
   * @param createNotificationDto - Notification creation data
   * @returns Created notification object
   */
  @Post()
  @ApiOperation({ 
    summary: 'Create a notification',
    description: 'Creates a new notification. Typically used internally by the system, but available for manual notification creation.'
  })
  @ApiBody({ type: CreateNotificationDto })
  @ApiCreatedResponse({ 
    description: 'Notification created successfully',
    type: NotificationResponseDto
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
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
  async createNotification(@Body() createNotificationDto: CreateNotificationDto) {
    return this.notificationService.createNotification(createNotificationDto);
  }

  /**
   * Marks a specific notification as read.
   * 
   * Users can only mark their own notifications as read.
   * 
   * @param req - Request object containing authenticated user information
   * @param notificationId - ID of the notification to mark as read
   * @returns Updated notification object
   * @throws {PrismaClientKnownRequestError} If notification not found or doesn't belong to user
   */
  @Patch(':id/read')
  @ApiOperation({ 
    summary: 'Mark notification as read',
    description: 'Marks a specific notification as read for the authenticated user. Records the read timestamp.'
  })
  @ApiParam({ 
    name: 'id', 
    type: Number,
    description: 'Notification ID to mark as read',
    example: 1
  })
  @ApiOkResponse({ 
    description: 'Notification marked as read successfully',
    type: NotificationResponseDto
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiNotFoundResponse({ 
    description: 'Notification not found or does not belong to user',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 }
      }
    }
  })
  async markAsRead(
    @Request() req: Request & { user: Omit<PayloadDTO, 'password'> },
    @Param('id', ParseIntPipe) notificationId: number,
  ) {
    const userId = req.user.sub;
    return this.notificationService.markAsRead(notificationId, userId);
  }

  /**
   * Marks all notifications as read for the authenticated user.
   * 
   * @param req - Request object containing authenticated user information
   * @returns Object containing the count of notifications marked as read
   */
  @Patch('mark-all-read')
  @ApiOperation({ 
    summary: 'Mark all notifications as read',
    description: 'Marks all unread notifications as read for the authenticated user. Records the read timestamp for each notification.'
  })
  @ApiOkResponse({ 
    description: 'All notifications marked as read successfully',
    schema: {
      type: 'object',
      properties: {
        count: { type: 'number', example: 10, description: 'Number of notifications marked as read' }
      }
    }
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  async markAllAsRead(
    @Request() req: Request & { user: Omit<PayloadDTO, 'password'> },
  ) {
    const userId = req.user.sub;
    return this.notificationService.markAllAsRead(userId);
  }

  /**
   * Deletes a notification.
   * 
   * Users can only delete their own notifications.
   * This operation is permanent and cannot be undone.
   * 
   * @param req - Request object containing authenticated user information
   * @param notificationId - ID of the notification to delete
   * @returns Deleted notification object
   * @throws {PrismaClientKnownRequestError} If notification not found or doesn't belong to user
   */
  @Delete(':id')
  @ApiOperation({ 
    summary: 'Delete a notification',
    description: 'Permanently deletes a notification. Users can only delete their own notifications. This operation cannot be undone.'
  })
  @ApiParam({ 
    name: 'id', 
    type: Number,
    description: 'Notification ID to delete',
    example: 1
  })
  @ApiOkResponse({ 
    description: 'Notification deleted successfully',
    type: NotificationResponseDto
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiNotFoundResponse({ 
    description: 'Notification not found or does not belong to user',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 }
      }
    }
  })
  async deleteNotification(
    @Request() req: Request & { user: Omit<PayloadDTO, 'password'> },
    @Param('id', ParseIntPipe) notificationId: number,
  ) {
    const userId = req.user.sub;
    return this.notificationService.deleteNotification(notificationId, userId);
  }
}

