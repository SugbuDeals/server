import { IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Join Subscription Data Transfer Object
 * 
 * DTO for retailers to join a subscription plan.
 * If the retailer already has an active subscription, it will be cancelled first.
 */
export class JoinSubscriptionDTO {
  /**
   * Subscription plan ID to join
   * Must be an active subscription plan
   */
  @ApiProperty({
    description: 'Subscription plan ID to join (must be active)',
    example: 1,
    type: Number,
    minimum: 1
  })
  @IsInt()
  subscriptionId: number;
}

