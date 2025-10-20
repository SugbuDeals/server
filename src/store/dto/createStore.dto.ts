import { IsEmpty, IsNotEmpty, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateStoreDTO {
  @ApiProperty({ example: 'Tech Hub' })
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Your friendly gadget store' })
  @IsNotEmpty()
  description: string;

  @ApiProperty({ description: "The Store Owner's ID", type: Number})
  @IsNumber()
  @Type(() => Number)
  ownerId?: number;
}
