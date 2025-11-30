import { IsNumber, IsString, IsEnum, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType } from 'generated/prisma';

export class CreateNotificationDto {
  @ApiProperty({ description: 'User ID to send notification to', type: Number })
  @IsNumber()
  @Type(() => Number)
  userId: number;

  @ApiProperty({
    description: 'Type of notification',
    enum: NotificationType,
  })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({ description: 'Notification title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Notification message' })
  @IsString()
  message: string;

  @ApiPropertyOptional({ description: 'Related product ID', type: Number })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  productId?: number;

  @ApiPropertyOptional({ description: 'Related store ID', type: Number })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  storeId?: number;

  @ApiPropertyOptional({ description: 'Related promotion ID', type: Number })
  @IsNumber()
  @Type(() => Number)
  @IsOptional()
  promotionId?: number;
}

