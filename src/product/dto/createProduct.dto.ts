import { IsString, IsNumber, IsBoolean, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProductDTO {
  @ApiProperty({ example: 'Apple iPhone 15', description: 'Product name' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'Newest model with A17 chip', description: 'Product description' })
  @IsString()
  description: string;

  @ApiProperty({ example: 599.99, description: 'Product price', type: Number })
  @IsNumber()
  @Type(() => Number)
  price: number;

  @ApiProperty({ example: 100, description: 'Units in stock', type: Number })
  @IsNumber()
  @Type(() => Number)
  stock: number;

  @ApiProperty({ example: true, required: false, description: 'Whether product is active' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({ example: 1, description: 'Related store id', type: Number })
  @IsNumber()
  @Type(() => Number)
  storeId: number;
}
