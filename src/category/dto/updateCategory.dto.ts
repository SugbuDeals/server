import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCategoryDTO {
  @ApiPropertyOptional({ example: 'Consumer Electronics' })
  @IsString()
  @IsOptional()
  name?: string;
}


