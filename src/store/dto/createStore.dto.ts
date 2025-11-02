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
  @ApiProperty({
    example: 'Tech Hub',
    description: 'The name of the store',
  })
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example:
      'Your friendly gadget store offering the latest electronics and accessories',
    description: 'A brief description of the store and what it offers',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    example: 10.3157,
    description: 'The latitude coordinate of the store location',
    minimum: -90,
    maximum: 90,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiProperty({
    example: 123.8854,
    description: 'The longitude coordinate of the store location',
    minimum: -180,
    maximum: 180,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiProperty({
    example: '123 Main Street, Building A',
    description: 'The street address of the store',
    required: false,
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({
    example: 'Mandaue City',
    description: 'The city where the store is located',
    required: false,
  })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({
    example: 'Cebu',
    description: 'The state or province where the store is located',
    required: false,
  })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiProperty({
    example: 'Philippines',
    description: 'The country where the store is located',
    required: false,
  })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiProperty({
    example: '6014',
    description: 'The postal or ZIP code of the store location',
    required: false,
  })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiProperty({
    example: 42,
    description: 'The unique identifier of the store owner',
    type: Number,
  })
  @IsNumber()
  @Type(() => Number)
  ownerId?: number;

  @ApiProperty({
    example: 'http://localhost:3000/files/file-1762098832774-779762879.webp',
    description: 'The url of the file',
    required: false,
  })
  @IsOptional()
  @IsString()
  imageUrl?: string;
}
