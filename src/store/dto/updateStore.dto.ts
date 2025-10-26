import { IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
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

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiPropertyOptional({ enum: StoreVerificationStatus })
  @IsOptional()
  verificationStatus: StoreVerificationStatus;

  @ApiProperty({ description: "The Store Owner's ID", type: Number })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  ownerId?: number;
}
