import { IsNotEmpty } from 'class-validator';
import { StoreVerificationStatus } from 'generated/prisma';

export class CreateStoreDTO {
  @IsNotEmpty()
  name: string;
  @IsNotEmpty()
  description: string;
}
