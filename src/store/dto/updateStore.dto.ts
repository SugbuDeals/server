import { IsNotEmpty, IsNumber, IsOptional } from 'class-validator';
import { StoreVerificationStatus } from 'generated/prisma';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UpdateStoreDTO {
  @ApiPropertyOptional({ example: 'Tech Hub' })
  @IsOptional()
  name: string;

  @ApiPropertyOptional({ example: 'Your friendly gadget store' })
  @IsOptional()
  description: string;

  @ApiPropertyOptional({ enum: StoreVerificationStatus })
  @IsOptional()
  verificationStatus: StoreVerificationStatus;

  @ApiPropertyOptional({ description: "The Store Owner's ID", type: Number })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  ownerId?: number;
}
