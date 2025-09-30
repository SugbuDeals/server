import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class ProductBookmarkDto {
  @ApiProperty({ example: 99, description: 'ID of the product to bookmark/unbookmark' })
  @IsInt()
  @Min(1)
  productId!: number;
}


