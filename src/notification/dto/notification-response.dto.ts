import { ApiProperty } from '@nestjs/swagger';
import { Notification, NotificationType } from 'generated/prisma';

export class NotificationResponseDto implements Notification {
  @ApiProperty()
  id: number;

  @ApiProperty()
  userId: number;

  @ApiProperty({ enum: NotificationType })
  type: NotificationType;

  @ApiProperty()
  title: string;

  @ApiProperty()
  message: string;

  @ApiProperty()
  read: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ nullable: true })
  readAt: Date | null;

  @ApiProperty({ nullable: true })
  productId: number | null;

  @ApiProperty({ nullable: true })
  storeId: number | null;

  @ApiProperty({ nullable: true })
  promotionId: number | null;
}

