import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, ValidateIf } from 'class-validator';
import { ReportReason } from 'generated/prisma';

/**
 * Create Report DTO
 * 
 * DTO for creating a report against a user (consumer) or a store.
 * Either reportedUserId or reportedStoreId must be provided, but not both.
 */
export class CreateReportDto {
  @ApiPropertyOptional({
    example: 1,
    description: 'User ID being reported (for reporting consumers). Either this or reportedStoreId must be provided.',
  })
  @IsOptional()
  @IsInt()
  @ValidateIf((o) => !o.reportedStoreId)
  @IsNotEmpty({ message: 'Either reportedUserId or reportedStoreId must be provided' })
  reportedUserId?: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'Store ID being reported (for reporting stores/retailers). Either this or reportedUserId must be provided.',
  })
  @IsOptional()
  @IsInt()
  @ValidateIf((o) => !o.reportedUserId)
  @IsNotEmpty({ message: 'Either reportedUserId or reportedStoreId must be provided' })
  reportedStoreId?: number;

  @ApiProperty({
    enum: ReportReason,
    example: ReportReason.SPAM,
    description: 'Reason for the report',
  })
  @IsEnum(ReportReason)
  @IsNotEmpty()
  reason: ReportReason;

  @ApiPropertyOptional({
    example: 'This user is posting spam messages repeatedly.',
    description: 'Optional additional details about the report',
  })
  @IsOptional()
  @IsString()
  description?: string;
}
