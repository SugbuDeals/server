import { IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class JoinSubscriptionDTO {
  @ApiProperty({
    description: 'Subscription ID to join',
    example: 1,
    type: Number,
  })
  @IsInt()
  subscriptionId: number;
}

