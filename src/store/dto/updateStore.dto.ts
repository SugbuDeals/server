import { IsNotEmpty } from 'class-validator';
import { StoreVerificationStatus } from 'generated/prisma';

export class UpdateStoreDTO {
  name: string;
  description: string;
  verificationStatus: StoreVerificationStatus;
}
