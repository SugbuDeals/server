import { IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateStoreDTO {
  @ApiProperty({ example: 'Tech Hub' })
  @IsNotEmpty()
  name: string;
  @ApiProperty({ example: 'Your friendly gadget store' })
  @IsNotEmpty()
  description: string;
}
