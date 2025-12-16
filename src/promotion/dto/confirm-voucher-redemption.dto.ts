import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for confirming voucher redemption by retailer
 */
export class ConfirmVoucherRedemptionDto {
  @ApiProperty({
    description: 'Voucher redemption token to confirm',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString()
  @IsNotEmpty()
  token: string;
}


