import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class StoreBookmarkDto {
  @ApiProperty({ example: 42, description: 'ID of the store to bookmark/unbookmark' })
  @IsInt()
  @Min(1)
  storeId!: number;
}

export class ListBookmarksDto {
  @ApiProperty({ example: 10, required: false, description: 'Number of results to return' })
  @IsInt()
  @Min(0)
  take?: number;

  @ApiProperty({ example: 0, required: false, description: 'Number of results to skip' })
  @IsInt()
  @Min(0)
  skip?: number;
}


