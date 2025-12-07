import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StoreVerificationStatus } from 'generated/prisma';

/**
 * Store Response DTO
 * 
 * Response DTO for store data.
 * Matches the Store model from Prisma schema.
 */
export class StoreResponseDto {
  @ApiProperty({ example: 1, description: 'Store ID' })
  id: number;

  @ApiProperty({ example: 'Electronics Store', description: 'Store name' })
  name: string;

  @ApiProperty({ example: 'Best electronics in town', description: 'Store description' })
  description: string;

  @ApiProperty({ 
    example: '2024-01-01T00:00:00.000Z', 
    description: 'Store creation timestamp',
    type: String,
    format: 'date-time'
  })
  createdAt: Date;

  @ApiProperty({ 
    enum: StoreVerificationStatus, 
    example: StoreVerificationStatus.UNVERIFIED,
    description: 'Store verification status'
  })
  verificationStatus: StoreVerificationStatus;

  @ApiProperty({ example: 1, description: 'Owner user ID' })
  ownerId: number;

  @ApiPropertyOptional({ 
    example: 'http://localhost:3000/files/image.jpg', 
    description: 'Store image URL',
    nullable: true
  })
  imageUrl: string | null;

  @ApiPropertyOptional({ 
    example: 'http://localhost:3000/files/banner.jpg', 
    description: 'Store banner URL',
    nullable: true
  })
  bannerUrl: string | null;

  @ApiProperty({ example: true, description: 'Whether store is active' })
  isActive: boolean;

  @ApiPropertyOptional({ 
    example: 10.3157, 
    description: 'Store latitude',
    nullable: true
  })
  latitude: number | null;

  @ApiPropertyOptional({ 
    example: 123.8854, 
    description: 'Store longitude',
    nullable: true
  })
  longitude: number | null;

  @ApiPropertyOptional({ 
    example: '123 Main St', 
    description: 'Store address',
    nullable: true
  })
  address: string | null;

  @ApiPropertyOptional({ 
    example: 'Cebu City', 
    description: 'Store city',
    nullable: true
  })
  city: string | null;

  @ApiPropertyOptional({ 
    example: 'Cebu', 
    description: 'Store state/province',
    nullable: true
  })
  state: string | null;

  @ApiPropertyOptional({ 
    example: 'Philippines', 
    description: 'Store country',
    nullable: true
  })
  country: string | null;

  @ApiPropertyOptional({ 
    example: '6000', 
    description: 'Store postal code',
    nullable: true
  })
  postalCode: string | null;
}

/**
 * Store with Distance Response DTO
 * 
 * Used for nearby store searches that include calculated distance.
 */
export class StoreWithDistanceResponseDto extends StoreResponseDto {
  @ApiProperty({ 
    example: 2.5, 
    description: 'Distance from search point in kilometers',
    type: Number
  })
  distance: number;
}

