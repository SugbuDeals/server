import {
  IsEnum,
  IsOptional,
  IsDecimal,
  IsDateString,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  SubscriptionPlan,
  SubscriptionStatus,
  BillingCycle,
} from 'generated/prisma';

export class UpdateSubscriptionDTO {
  @ApiPropertyOptional({
    enum: SubscriptionPlan,
    description: 'Subscription plan type',
  })
  @IsEnum(SubscriptionPlan)
  @IsOptional()
  plan?: SubscriptionPlan;

  @ApiPropertyOptional({
    enum: SubscriptionStatus,
    description: 'Subscription status',
  })
  @IsEnum(SubscriptionStatus)
  @IsOptional()
  status?: SubscriptionStatus;

  @ApiPropertyOptional({
    enum: BillingCycle,
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

  @ApiPropertyOptional({
    description: 'Subscription cancellation date',
    example: '2024-06-01T00:00:00Z',
  })
  @IsDateString()
  @IsOptional()
  cancelledAt?: string;
}

