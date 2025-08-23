import { IsNotEmpty } from 'class-validator';
import { StoreVerificationStatus } from 'generated/prisma';

export class UpdateStoreDTO {
  @IsNotEmpty()
  name: string;
  @IsNotEmpty()
  description: string;
  @IsNotEmpty()
  verificationStatus: StoreVerificationStatus;
}
