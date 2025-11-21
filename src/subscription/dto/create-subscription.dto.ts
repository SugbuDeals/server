import {
  IsEnum,
  IsInt,
  IsOptional,
  IsDecimal,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  SubscriptionPlan,
  SubscriptionStatus,
  BillingCycle,
} from 'generated/prisma';

export class CreateSubscriptionDTO {
  @ApiProperty({
    description: 'User ID to create subscription for',
    example: 1,
    type: Number,
  })
  @IsInt()
  userId: number;

  @ApiPropertyOptional({
    enum: SubscriptionPlan,
    default: SubscriptionPlan.FREE,
    description: 'Subscription plan type',
  })
  @IsEnum(SubscriptionPlan)
  @IsOptional()
  plan?: SubscriptionPlan;

  @ApiPropertyOptional({
    enum: SubscriptionStatus,
    default: SubscriptionStatus.ACTIVE,
    description: 'Subscription status',
  })
  @IsEnum(SubscriptionStatus)
  @IsOptional()
  status?: SubscriptionStatus;

  @ApiPropertyOptional({
    enum: BillingCycle,
    default: BillingCycle.MONTHLY,
    description: 'Billing cycle',
  })
  @IsEnum(BillingCycle)
  @IsOptional()
  billingCycle?: BillingCycle;

  @ApiPropertyOptional({
    description: 'Subscription price',
    example: '9.99',
    type: String,
  })
  @IsDecimal()
  @IsOptional()
  price?: string;

  @ApiPropertyOptional({
    description: 'Subscription start date',
    example: '2024-01-01T00:00:00Z',
  })
  @IsDateString()
  @IsOptional()
  startsAt?: string;

  @ApiPropertyOptional({
    description: 'Subscription end date',
    example: '2024-12-31T23:59:59Z',
  })
  @IsDateString()
  @IsOptional()
  endsAt?: string;
}

