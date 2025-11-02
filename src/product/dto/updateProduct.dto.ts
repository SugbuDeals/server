import { IsString, IsNumber, IsBoolean, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProductDTO {
  @ApiPropertyOptional({
    example: 'Apple iPhone 15',
    description: 'Product name',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    example: 'Newest model with A17 chip',
    description: 'Product description',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    example: 599.99,
    description: 'Product price',
    type: Number,
  })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  price?: number;

  @ApiPropertyOptional({
    example: 100,
    description: 'Units in stock',
    type: Number,
  })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  stock?: number;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether product is active',
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    example: 'http://localhost:3000/files/file-1762098832774-779762879.webp',
    description: 'The url of the file',
    required: false,
  })
  @IsOptional()
  @IsString()
  imageUrl?: string;
}
