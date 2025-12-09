import { ApiProperty } from '@nestjs/swagger';
import { SubscriptionTier, UserRole } from 'generated/prisma';

/**
 * Subscription Tier Response DTO
 * 
 * Represents the current subscription tier information for a user.
 * Used to return tier status in API responses.
 */
export class SubscriptionTierResponseDto {
  @ApiProperty({
    description: 'User ID',
    example: 1,
  })
  userId: number;

  @ApiProperty({
    description: 'User email',
    example: 'user@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'User name',
    example: 'John Doe',
  })
  name: string;

  @ApiProperty({
    description: 'Current subscription tier',
    enum: SubscriptionTier,
    example: SubscriptionTier.BASIC,
  })
  tier: SubscriptionTier;

  @ApiProperty({
    description: 'User role',
    enum: UserRole,
    example: UserRole.CONSUMER,
  })
  role: UserRole;
}

