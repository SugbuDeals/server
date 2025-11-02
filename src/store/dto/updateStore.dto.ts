import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { StoreVerificationStatus } from 'generated/prisma';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UpdateStoreDTO {
  @ApiPropertyOptional({
    example: 'Tech Hub Premium',
    description: 'The updated name of the store',
  })
  @IsOptional()
  name: string;

  @ApiPropertyOptional({
    example:
      'Your premium destination for the latest electronics, gadgets, and tech accessories',
    description: 'An updated description of the store and what it offers',
  })
  @IsOptional()
  description: string;

  @ApiPropertyOptional({
    example: 10.3157,
    description: 'The updated latitude coordinate of the store location',
    minimum: -90,
    maximum: 90,
  })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional({
    example: 123.8854,
    description: 'The updated longitude coordinate of the store location',
    minimum: -180,
    maximum: 180,
  })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiPropertyOptional({
    example: '456 Commerce Avenue, Suite 200',
    description: 'The updated street address of the store',
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({
    example: 'Cebu City',
    description: 'The updated city where the store is located',
  })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({
    example: 'Cebu',
    description: 'The updated state or province where the store is located',
  })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({
    example: 'Philippines',
    description: 'The updated country where the store is located',
  })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({
    example: '6000',
    description: 'The updated postal or ZIP code of the store location',
  })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiPropertyOptional({
    enum: StoreVerificationStatus,
    description: 'The verification status of the store',
    example: StoreVerificationStatus.VERIFIED,
  })
  @IsOptional()
  verificationStatus: StoreVerificationStatus;

  @ApiPropertyOptional({
    example: 42,
    description: 'The unique identifier of the updated store owner',
    type: Number,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  ownerId?: number;
}
