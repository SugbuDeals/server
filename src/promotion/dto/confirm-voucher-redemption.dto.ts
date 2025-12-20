import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for confirming voucher redemption by retailer
 * Note: Each voucher can only be used for one product, selected by the consumer when generating the token.
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






