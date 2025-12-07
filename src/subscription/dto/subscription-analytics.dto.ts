import { ApiProperty } from '@nestjs/swagger';
import { SubscriptionPlan, SubscriptionStatus, BillingCycle } from 'generated/prisma';

/**
 * Subscription Count by Plan
 * 
 * Represents the count of subscriptions grouped by plan type.
 */
export class SubscriptionCountByPlan {
  @ApiProperty({ enum: SubscriptionPlan })
  plan: SubscriptionPlan;

  @ApiProperty({ description: 'Number of subscriptions with this plan', example: 10 })
  count: number;
}

/**
 * Subscription Count by Status
 * 
 * Represents the count of subscriptions grouped by status.
 */
export class SubscriptionCountByStatus {
  @ApiProperty({ enum: SubscriptionStatus })
  status: SubscriptionStatus;

  @ApiProperty({ description: 'Number of subscriptions with this status', example: 25 })
  count: number;
}

/**
 * Subscription Count by Billing Cycle
 * 
 * Represents the count of subscriptions grouped by billing cycle.
 */
export class SubscriptionCountByBillingCycle {
  @ApiProperty({ enum: BillingCycle })
  billingCycle: BillingCycle;

  @ApiProperty({ description: 'Number of subscriptions with this billing cycle', example: 15 })
  count: number;
}

/**
 * Subscription Analytics Data Transfer Object
 * 
 * Comprehensive analytics data for subscription management dashboard.
 * Includes counts, revenue metrics, and trend information.
 */
export class SubscriptionAnalyticsDTO {
  @ApiProperty({ description: 'Total number of subscriptions', example: 100 })
  total: number;

  @ApiProperty({ description: 'Number of active subscriptions', example: 45 })
  active: number;

  @ApiProperty({ description: 'Number of cancelled subscriptions', example: 30 })
  cancelled: number;

  @ApiProperty({ description: 'Number of expired subscriptions', example: 20 })
  expired: number;

  @ApiProperty({ description: 'Number of pending subscriptions', example: 5 })
  pending: number;

  @ApiProperty({
    description: 'Subscriptions grouped by plan',
    type: [SubscriptionCountByPlan],
  })
  byPlan: SubscriptionCountByPlan[];

  @ApiProperty({
    description: 'Subscriptions grouped by status',
    type: [SubscriptionCountByStatus],
  })
  byStatus: SubscriptionCountByStatus[];

  @ApiProperty({
    description: 'Subscriptions grouped by billing cycle',
    type: [SubscriptionCountByBillingCycle],
  })
  byBillingCycle: SubscriptionCountByBillingCycle[];

  @ApiProperty({
    description: 'Total revenue from active subscriptions',
    example: '1250.50',
    type: String,
  })
  totalRevenue: string;

  @ApiProperty({
    description: 'Average subscription price',
    example: '25.50',
    type: String,
  })
  averagePrice: string;

  @ApiProperty({
    description: 'Number of subscriptions created in the last 30 days',
    example: 12,
  })
  recentSubscriptions: number;

  @ApiProperty({
    description: 'Number of subscriptions created this month',
    example: 8,
  })
  subscriptionsThisMonth: number;
}

