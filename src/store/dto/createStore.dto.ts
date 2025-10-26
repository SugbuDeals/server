import {
  IsEmpty,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateStoreDTO {
  @ApiProperty({ example: 'Tech Hub' })
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Your friendly gadget store' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiProperty({ description: "The Store Owner's ID", type: Number })
  @IsNumber()
  @Type(() => Number)
  ownerId?: number;
}
