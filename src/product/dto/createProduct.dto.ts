import { IsNotEmpty } from 'class-validator';

export class CreateProductDTO {
  @IsNotEmpty() name: string;
  @IsNotEmpty() description: string;
  price: number;
  stock: number;
  @IsNotEmpty() storeId: number;
}
