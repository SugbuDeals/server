import { IsNotEmpty, IsOptional } from 'class-validator';
import { StoreVerificationStatus } from 'generated/prisma';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateStoreDTO {
  @ApiPropertyOptional({ example: 'Tech Hub' })
  @IsOptional()
  name: string;
  @ApiPropertyOptional({ example: 'Your friendly gadget store' })
  @IsOptional()
  description: string;
  @ApiPropertyOptional({ enum: StoreVerificationStatus })
  @IsOptional()
  verificationStatus: StoreVerificationStatus;
}
