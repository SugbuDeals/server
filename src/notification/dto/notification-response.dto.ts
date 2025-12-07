import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType } from 'generated/prisma';

/**
 * Notification Response DTO
 * 
 * Response DTO for notification data.
 * Matches the Notification model from Prisma schema.
 */
export class NotificationResponseDto {
  @ApiProperty({ example: 1, description: 'Notification ID' })
  id: number;

  @ApiProperty({ example: 1, description: 'User ID' })
  userId: number;

  @ApiProperty({ 
    enum: NotificationType, 
    example: NotificationType.PRODUCT_CREATED,
    description: 'Notification type'
  })
  type: NotificationType;

  @ApiProperty({ example: 'New Product Available', description: 'Notification title' })
  title: string;

  @ApiProperty({ example: 'A new product has been added to your bookmarked store', description: 'Notification message' })
  message: string;

  @ApiProperty({ example: false, description: 'Whether notification has been read' })
  read: boolean;

  @ApiProperty({ 
    example: '2024-01-01T00:00:00.000Z', 
    description: 'Notification creation timestamp',
    type: String,
    format: 'date-time'
  })
  createdAt: Date;

  @ApiPropertyOptional({ 
    example: '2024-01-01T12:00:00.000Z', 
    description: 'Notification read timestamp',
    type: String,
    format: 'date-time',
    nullable: true
  })
  readAt: Date | null;

  @ApiPropertyOptional({ 
    example: 1, 
    description: 'Related product ID (nullable)',
    nullable: true
  })
  productId: number | null;

  @ApiPropertyOptional({ 
    example: 1, 
    description: 'Related store ID (nullable)',
    nullable: true
  })
  storeId: number | null;

  @ApiPropertyOptional({ 
    example: 1, 
    description: 'Related promotion ID (nullable)',
    nullable: true
  })
  promotionId: number | null;
}

