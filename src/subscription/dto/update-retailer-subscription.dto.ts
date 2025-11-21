import { IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateRetailerSubscriptionDTO {
  @ApiProperty({
    description: 'Subscription ID to update to',
    example: 1,
    type: Number,
  })
  @IsInt()
  subscriptionId: number;
}

