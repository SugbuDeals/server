import { IsNotEmpty } from 'class-validator';

export class CreateStoreInput {
  @IsNotEmpty()
  name: string;

  @IsNotEmpty()
  description: string;
}
