import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiOkResponse,
  ApiBody,
} from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { PayloadDTO } from 'src/auth/dto/payload.dto';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { NotificationResponseDto } from './dto/notification-response.dto';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('bearer')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @ApiOperation({ summary: 'Get user notifications' })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  @ApiQuery({ name: 'read', required: false, type: Boolean })
  @ApiOkResponse({
    description: 'Returns list of notifications',
    type: [NotificationResponseDto],
  })
  async getNotifications(
    @Request() req: Request & { user: Omit<PayloadDTO, 'password'> },
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('read') read?: string,
  ) {
    const userId = req.user.sub;
    return this.notificationService.getUserNotifications(userId, {
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
      read: read === 'true' ? true : read === 'false' ? false : undefined,
    });
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  @ApiOkResponse({ description: 'Returns unread count', type: Number })
  async getUnreadCount(
    @Request() req: Request & { user: Omit<PayloadDTO, 'password'> },
  ) {
    const userId = req.user.sub;
    return { count: await this.notificationService.getUnreadCount(userId) };
  }

  @Post()
  @ApiOperation({ summary: 'Create a notification (admin only)' })
  @ApiBody({ type: CreateNotificationDto })
  @ApiOkResponse({
    description: 'Notification created',
    type: NotificationResponseDto,
  })
  async createNotification(@Body() createNotificationDto: CreateNotificationDto) {
    return this.notificationService.createNotification(createNotificationDto);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({
    description: 'Notification marked as read',
    type: NotificationResponseDto,
  })
  async markAsRead(
    @Request() req: Request & { user: Omit<PayloadDTO, 'password'> },
    @Param('id', ParseIntPipe) id: number,
  ) {
    const userId = req.user.sub;
    return this.notificationService.markAsRead(id, userId);
  }

  @Patch('mark-all-read')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiOkResponse({ description: 'All notifications marked as read' })
  async markAllAsRead(
    @Request() req: Request & { user: Omit<PayloadDTO, 'password'> },
  ) {
    const userId = req.user.sub;
    return this.notificationService.markAllAsRead(userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a notification' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({
    description: 'Notification deleted',
    type: NotificationResponseDto,
  })
  async deleteNotification(
    @Request() req: Request & { user: Omit<PayloadDTO, 'password'> },
    @Param('id', ParseIntPipe) id: number,
  ) {
    const userId = req.user.sub;
    return this.notificationService.deleteNotification(id, userId);
  }
}

