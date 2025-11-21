import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateProductStatusDTO {
  @ApiProperty({
    description: 'Flag indicating whether the product is active',
    example: false,
  })
  @IsBoolean()
  isActive: boolean;
}

