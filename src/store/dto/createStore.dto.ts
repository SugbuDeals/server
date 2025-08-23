import { IsNotEmpty } from 'class-validator';

export class CreateStoreDTO {
  @IsNotEmpty()
  name: string;
  @IsNotEmpty()
  description: string;
}
