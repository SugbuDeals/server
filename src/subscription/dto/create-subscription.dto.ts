import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsDecimal,
  IsDateString,
  IsString,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SubscriptionPlan, BillingCycle } from 'generated/prisma';

export class CreateSubscriptionDTO {
  @ApiProperty({
    description: 'Display name of the subscription',
    example: 'Premium Retailer',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: 'Short description of the subscription',
    example: 'Unlock all premium retailer features and support.',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    enum: SubscriptionPlan,
    default: SubscriptionPlan.FREE,
    description: 'Subscription plan category',
  })
  @IsEnum(SubscriptionPlan)
  @IsOptional()
  plan?: SubscriptionPlan;

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
    description: 'Additional benefits or perks description',
    example: '• Unlimited listings\n• Featured placement\n• Priority support',
  })
  @IsString()
  @IsOptional()
  benefits?: string;

  @ApiPropertyOptional({
    description: 'Whether this subscription is currently available for retailers',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Subscription availability start date',
    example: '2024-01-01T00:00:00Z',
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

