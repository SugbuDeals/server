import { UserRole } from 'generated/prisma';

export class PayloadDTO {
  email: string;
  sub: number;
  role: UserRole;
}
