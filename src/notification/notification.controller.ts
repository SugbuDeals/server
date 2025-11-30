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
} from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { PayloadDTO } from 'src/auth/dto/payload.dto';

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
  @ApiOkResponse({ description: 'Returns list of notifications' })
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

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  @ApiOkResponse({ description: 'Returns unread count' })
  async getUnreadCount(
    @Request() req: Request & { user: Omit<PayloadDTO, 'password'> },
  ) {
    const userId = req.user.sub;
    return this.notificationService.getUnreadCount(userId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a notification' })
  @ApiBody({ type: CreateNotificationDto })
  @ApiOkResponse({ description: 'Notification created' })
  async createNotification(@Body() createNotificationDto: CreateNotificationDto) {
    return this.notificationService.createNotification(createNotificationDto);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ description: 'Notification marked as read' })
  async markAsRead(
    @Request() req: Request & { user: Omit<PayloadDTO, 'password'> },
    @Param('id', ParseIntPipe) notificationId: number,
  ) {
    const userId = req.user.sub;
    return this.notificationService.markAsRead(notificationId, userId);
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
  @ApiOkResponse({ description: 'Notification deleted' })
  async deleteNotification(
    @Request() req: Request & { user: Omit<PayloadDTO, 'password'> },
    @Param('id', ParseIntPipe) notificationId: number,
  ) {
    const userId = req.user.sub;
    return this.notificationService.deleteNotification(notificationId, userId);
  }
}

