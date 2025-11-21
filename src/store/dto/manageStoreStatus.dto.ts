import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { StoreVerificationStatus } from 'generated/prisma';

export class ManageStoreStatusDTO {
  @ApiPropertyOptional({
    enum: StoreVerificationStatus,
    description: 'Verification status to assign to the store',
  })
  @IsEnum(StoreVerificationStatus)
  @IsOptional()
  verificationStatus?: StoreVerificationStatus;

  @ApiPropertyOptional({
    description: 'Whether the store is active and visible to users',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

