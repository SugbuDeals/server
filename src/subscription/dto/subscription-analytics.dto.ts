import { ApiProperty } from '@nestjs/swagger';

/**
 * Role-Tier Count DTO
 * 
 * Represents the count of users with BASIC and PRO tiers for a specific role.
 */
class RoleTierCountDto {
  @ApiProperty({
    description: 'Number of users with BASIC tier',
    example: 50,
  })
  basic: number;

  @ApiProperty({
    description: 'Number of users with PRO tier',
    example: 25,
  })
  pro: number;

  @ApiProperty({
    description: 'Total users in this role',
    example: 75,
  })
  total: number;
}

/**
 * By Role and Tier DTO
 * 
 * Represents the distribution of subscription tiers across different user roles.
 */
class ByRoleAndTierDto {
  @ApiProperty({
    description: 'Consumer tier distribution',
    type: RoleTierCountDto,
  })
  consumer: RoleTierCountDto;

  @ApiProperty({
    description: 'Retailer tier distribution',
    type: RoleTierCountDto,
  })
  retailer: RoleTierCountDto;

  @ApiProperty({
    description: 'Admin tier distribution',
    type: RoleTierCountDto,
  })
  admin: RoleTierCountDto;
}

/**
 * Revenue DTO
 * 
 * Represents the revenue generated from PRO subscriptions.
 */
class RevenueDto {
  @ApiProperty({
    description: 'Monthly revenue from PRO subscriptions',
    example: 2500,
  })
  monthly: number;

  @ApiProperty({
    description: 'Yearly revenue from PRO subscriptions',
    example: 30000,
  })
  yearly: number;

  @ApiProperty({
    description: 'Currency code',
    example: 'PHP',
  })
  currency: string;
}

/**
 * Subscription Analytics DTO
 * 
 * Comprehensive analytics for subscription tiers.
 * Provides counts by tier, role-tier distribution, and revenue metrics.
 * 
 * Used by admin dashboard to view subscription statistics.
 */
export class SubscriptionAnalyticsDto {
  @ApiProperty({
    description: 'Total number of users',
    example: 150,
  })
  totalUsers: number;

  @ApiProperty({
    description: 'Number of users with BASIC tier',
    example: 100,
  })
  basicUsers: number;

  @ApiProperty({
    description: 'Number of users with PRO tier',
    example: 50,
  })
  proUsers: number;

  @ApiProperty({
    description: 'Distribution of tiers by role',
    type: ByRoleAndTierDto,
  })
  byRoleAndTier: ByRoleAndTierDto;

  @ApiProperty({
    description: 'Revenue metrics from PRO subscriptions',
    type: RevenueDto,
  })
  revenue: RevenueDto;
}
