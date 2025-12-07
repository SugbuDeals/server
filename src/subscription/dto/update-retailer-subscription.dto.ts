import { IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Update Retailer Subscription Data Transfer Object
 * 
 * DTO for retailers to update their active subscription to a different plan.
 * Requires an existing active subscription. The current subscription will be cancelled
 * and a new one created with the specified plan.
 */
export class UpdateRetailerSubscriptionDTO {
  /**
   * Subscription plan ID to update to
   * Must be an active subscription plan
   */
  @ApiProperty({
    description: 'Subscription plan ID to update to (must be active)',
    example: 1,
    type: Number,
    minimum: 1
  })
  @IsInt()
  subscriptionId: number;
}

