import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, ValidateIf } from 'class-validator';
import { ReportReason } from 'generated/prisma';

/**
 * Create Report DTO
 * 
 * DTO for creating a report against a user (consumer) or a store (retailer).
 * 
 * **Validation Rules:**
 * - Exactly one of `reportedUserId` or `reportedStoreId` must be provided (not both, not neither)
 * - `reason` is required and must be a valid ReportReason enum value
 * - `description` is optional but recommended for providing context
 * 
 * **Business Rules:**
 * - Users cannot report themselves
 * - Store owners cannot report their own stores
 * - The reported user or store must exist
 */
export class CreateReportDto {
  @ApiPropertyOptional({
    example: 1,
    description: 'User ID being reported (for reporting consumers). Either this or reportedStoreId must be provided, but not both. The user must exist and cannot be the same as the reporter.',
    type: Number,
  })
  @IsOptional()
  @IsInt()
  @ValidateIf((o) => !o.reportedStoreId)
  @IsNotEmpty({ message: 'Either reportedUserId or reportedStoreId must be provided' })
  reportedUserId?: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'Store ID being reported (for reporting stores/retailers). Either this or reportedUserId must be provided, but not both. The store must exist and cannot be owned by the reporter.',
    type: Number,
  })
  @IsOptional()
  @IsInt()
  @ValidateIf((o) => !o.reportedUserId)
  @IsNotEmpty({ message: 'Either reportedUserId or reportedStoreId must be provided' })
  reportedStoreId?: number;

  @ApiProperty({
    enum: ReportReason,
    enumName: 'ReportReason',
    example: ReportReason.SPAM,
    description: 'Reason for the report. Valid values: SPAM, HARASSMENT, INAPPROPRIATE_CONTENT, FAKE_REVIEW, SCAM, OTHER.',
    type: String,
  })
  @IsEnum(ReportReason)
  @IsNotEmpty()
  reason: ReportReason;

  @ApiPropertyOptional({
    example: 'This user is posting spam messages repeatedly.',
    description: 'Optional additional details about the report. Recommended to provide context for the report reason.',
    type: String,
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  description?: string;
}
