import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { NotificationType } from 'generated/prisma';

export class CreateNotificationDto {
  @ApiProperty({ description: 'User ID to notify' })
  @IsInt()
  @IsNotEmpty()
  userId: number;

  @ApiProperty({ enum: NotificationType, description: 'Type of notification' })
  @IsEnum(NotificationType)
  @IsNotEmpty()
  type: NotificationType;

  @ApiProperty({ description: 'Notification title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Notification message' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({ description: 'Related product ID', required: false })
  @IsInt()
  @IsOptional()
  productId?: number;

  @ApiProperty({ description: 'Related store ID', required: false })
  @IsInt()
  @IsOptional()
  storeId?: number;

  @ApiProperty({ description: 'Related promotion ID', required: false })
  @IsInt()
  @IsOptional()
  promotionId?: number;
}

