import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsDecimal,
  IsDateString,
  IsString,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { SubscriptionPlan, BillingCycle } from 'generated/prisma';

export class UpdateSubscriptionDTO {
  @ApiPropertyOptional({
    description: 'Display name of the subscription',
    example: 'Premium Retailer Plus',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'Short description of the subscription',
    example: 'Adds concierge onboarding and analytics.',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    enum: SubscriptionPlan,
    description: 'Subscription plan category',
  })
  @IsEnum(SubscriptionPlan)
  @IsOptional()
  plan?: SubscriptionPlan;

  @ApiPropertyOptional({
    enum: BillingCycle,
    description: 'Billing cycle',
  })
  @IsEnum(BillingCycle)
  @IsOptional()
  billingCycle?: BillingCycle;

  @ApiPropertyOptional({
    description: 'Subscription price',
    example: '19.99',
    type: String,
  })
  @IsDecimal()
  @IsOptional()
  price?: string;

  @ApiPropertyOptional({
    description: 'Additional benefits or perks description',
    example: '• Dedicated success manager\n• Exclusive promotions',
  })
  @IsString()
  @IsOptional()
  benefits?: string;

  @ApiPropertyOptional({
    description: 'Whether this subscription is currently active',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Subscription availability start date',
    example: '2024-02-01T00:00:00Z',
  })
  @IsDateString()
  @IsOptional()
  startsAt?: string;

  @ApiPropertyOptional({
    description: 'Subscription availability end date',
    example: '2024-12-31T23:59:59Z',
  })
  @IsDateString()
  @IsOptional()
  endsAt?: string;
}

