import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SubscriptionPlan, BillingCycle, SubscriptionStatus } from 'generated/prisma';

/**
 * Subscription Plan Response DTO
 * 
 * Response DTO for subscription plan data.
 * Matches the Subscription model from Prisma schema.
 */
export class SubscriptionResponseDto {
  @ApiProperty({ example: 1, description: 'Subscription plan ID' })
  id: number;

  @ApiProperty({ example: 'Premium Plan', description: 'Subscription plan name' })
  name: string;

  @ApiPropertyOptional({ 
    example: 'Get access to premium features', 
    description: 'Subscription plan description',
    nullable: true
  })
  description: string | null;

  @ApiProperty({ 
    enum: SubscriptionPlan, 
    example: SubscriptionPlan.PREMIUM,
    description: 'Subscription plan type'
  })
  plan: SubscriptionPlan;

  @ApiProperty({ 
    enum: BillingCycle, 
    example: BillingCycle.MONTHLY,
    description: 'Billing cycle'
  })
  billingCycle: BillingCycle;

  @ApiProperty({ example: '99.99', description: 'Subscription price (Decimal as string)', type: String })
  price: string;

  @ApiPropertyOptional({ 
    example: 'Premium features, priority support', 
    description: 'Subscription benefits',
    nullable: true
  })
  benefits: string | null;

  @ApiProperty({ example: true, description: 'Whether subscription plan is active' })
  isActive: boolean;

  @ApiProperty({ 
    example: '2024-01-01T00:00:00.000Z', 
    description: 'Subscription plan creation timestamp',
    type: String,
    format: 'date-time'
  })
  createdAt: Date;

  @ApiProperty({ 
    example: '2024-01-01T00:00:00.000Z', 
    description: 'Subscription plan last update timestamp',
    type: String,
    format: 'date-time'
  })
  updatedAt: Date;

  @ApiProperty({ 
    example: '2024-01-01T00:00:00.000Z', 
    description: 'Subscription plan start timestamp',
    type: String,
    format: 'date-time'
  })
  startsAt: Date;

  @ApiPropertyOptional({ 
    example: '2024-12-31T23:59:59.000Z', 
    description: 'Subscription plan end timestamp',
    type: String,
    format: 'date-time',
    nullable: true
  })
  endsAt: Date | null;
}

/**
 * User Subscription Response DTO
 * 
 * Response DTO for user subscription data.
 * Matches the UserSubscription model from Prisma schema.
 */
export class UserSubscriptionResponseDto {
  @ApiProperty({ example: 1, description: 'User subscription ID' })
  id: number;

  @ApiProperty({ example: 1, description: 'User ID' })
  userId: number;

  @ApiProperty({ example: 1, description: 'Subscription plan ID' })
  subscriptionId: number;

  @ApiProperty({ 
    enum: SubscriptionStatus, 
    example: SubscriptionStatus.ACTIVE,
    description: 'Subscription status'
  })
  status: SubscriptionStatus;

  @ApiProperty({ example: '99.99', description: 'Subscription price (Decimal as string)', type: String })
  price: string;

  @ApiProperty({ 
    enum: BillingCycle, 
    example: BillingCycle.MONTHLY,
    description: 'Billing cycle'
  })
  billingCycle: BillingCycle;

  @ApiProperty({ 
    example: '2024-01-01T00:00:00.000Z', 
    description: 'Subscription start timestamp',
    type: String,
    format: 'date-time'
  })
  startsAt: Date;

  @ApiPropertyOptional({ 
    example: '2024-12-31T23:59:59.000Z', 
    description: 'Subscription end timestamp',
    type: String,
    format: 'date-time',
    nullable: true
  })
  endsAt: Date | null;

  @ApiPropertyOptional({ 
    example: '2024-06-15T00:00:00.000Z', 
    description: 'Subscription cancellation timestamp',
    type: String,
    format: 'date-time',
    nullable: true
  })
  cancelledAt: Date | null;

  @ApiProperty({ 
    example: '2024-01-01T00:00:00.000Z', 
    description: 'User subscription creation timestamp',
    type: String,
    format: 'date-time'
  })
  createdAt: Date;

  @ApiProperty({ 
    example: '2024-01-01T00:00:00.000Z', 
    description: 'User subscription last update timestamp',
    type: String,
    format: 'date-time'
  })
  updatedAt: Date;

  @ApiPropertyOptional({ 
    type: SubscriptionResponseDto, 
    description: 'Subscription plan details (when included)',
    required: false
  })
  subscription?: SubscriptionResponseDto;
}

