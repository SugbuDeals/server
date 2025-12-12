import { ApiProperty } from '@nestjs/swagger';
import { VoucherRedemptionStatus } from 'generated/prisma';

/**
 * Response DTO for voucher token generation
 */
export class VoucherTokenResponseDto {
  @ApiProperty({
    description: 'JWT token containing voucher redemption information',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  token: string;

  @ApiProperty({
    description: 'Consumer user ID',
    example: 1,
  })
  userId: number;

  @ApiProperty({
    description: 'Consumer name',
    example: 'John Doe',
  })
  userName: string;

  @ApiProperty({
    description: 'Voucher redemption ID',
    example: 1,
  })
  redemptionId: number;

  @ApiProperty({
    description: 'Promotion ID',
    example: 1,
  })
  promotionId: number;

  @ApiProperty({
    description: 'Store ID where redemption will occur',
    example: 1,
  })
  storeId: number;

  @ApiProperty({
    description: 'Product ID (if specific product)',
    example: 1,
    required: false,
  })
  productId?: number;

  @ApiProperty({
    description: 'Current status of voucher redemption',
    enum: VoucherRedemptionStatus,
    example: VoucherRedemptionStatus.PENDING,
  })
  status: VoucherRedemptionStatus;
}

/**
 * Response DTO for voucher verification
 */
export class VoucherVerificationResponseDto {
  @ApiProperty({
    description: 'Whether the voucher is valid',
    example: true,
  })
  valid: boolean;

  @ApiProperty({
    description: 'Consumer user ID',
    example: 1,
  })
  userId: number;

  @ApiProperty({
    description: 'Consumer name',
    example: 'John Doe',
  })
  userName: string;

  @ApiProperty({
    description: 'Consumer subscription tier',
    example: 'PRO',
  })
  subscriptionTier: string;

  @ApiProperty({
    description: 'Voucher redemption ID',
    example: 1,
  })
  redemptionId: number;

  @ApiProperty({
    description: 'Promotion title',
    example: 'Holiday Gift Voucher',
  })
  promotionTitle: string;

  @ApiProperty({
    description: 'Voucher value',
    example: 50,
  })
  voucherValue: number;

  @ApiProperty({
    description: 'Store ID',
    example: 1,
  })
  storeId: number;

  @ApiProperty({
    description: 'Product ID (if specific product)',
    example: 1,
    required: false,
  })
  productId?: number;

  @ApiProperty({
    description: 'Current status',
    enum: VoucherRedemptionStatus,
    example: VoucherRedemptionStatus.VERIFIED,
  })
  status: VoucherRedemptionStatus;

  @ApiProperty({
    description: 'Error message if validation failed',
    example: 'Voucher already redeemed',
    required: false,
  })
  message?: string;
}

