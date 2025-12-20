import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { ReportReason, ReportStatus } from 'generated/prisma';

/**
 * Report Response DTO
 * 
 * Response DTO for report data.
 */
export class ReportResponseDto {
  @ApiProperty({ example: 1, description: 'Report ID' })
  id: number;

  @ApiProperty({ example: 1, description: 'User ID who created the report' })
  reporterId: number;

  @ApiPropertyOptional({ example: 'John Doe', description: 'Reporter name' })
  reporterName?: string;

  @ApiPropertyOptional({ example: 1, description: 'User ID being reported (nullable - for reporting consumers)', nullable: true })
  reportedUserId: number | null;

  @ApiPropertyOptional({ example: 'Jane Doe', description: 'Reported user name (if reporting a user)', nullable: true })
  reportedUserName?: string | null;

  @ApiPropertyOptional({ example: 1, description: 'Store ID being reported (nullable - for reporting stores)', nullable: true })
  reportedStoreId: number | null;

  @ApiPropertyOptional({ example: 'Electronics Store', description: 'Reported store name (if reporting a store)', nullable: true })
  reportedStoreName?: string | null;

  @ApiProperty({
    enum: ReportReason,
    example: ReportReason.SPAM,
    description: 'Reason for the report',
  })
  reason: ReportReason;

  @ApiPropertyOptional({
    example: 'This user is posting spam messages repeatedly.',
    description: 'Additional details about the report',
    nullable: true,
  })
  description: string | null;

  @ApiProperty({
    enum: ReportStatus,
    example: ReportStatus.PENDING,
    description: 'Current status of the report',
  })
  status: ReportStatus;

  @ApiProperty({
    example: '2024-01-01T00:00:00.000Z',
    description: 'Report creation timestamp',
    type: String,
    format: 'date-time',
  })
  createdAt: Date;

  @ApiPropertyOptional({
    example: '2024-01-02T00:00:00.000Z',
    description: 'When the report was reviewed',
    type: String,
    format: 'date-time',
    nullable: true,
  })
  reviewedAt: Date | null;

  @ApiPropertyOptional({
    example: 1,
    description: 'Admin user ID who reviewed the report',
    nullable: true,
  })
  reviewedById: number | null;

  @ApiPropertyOptional({
    example: 'Admin User',
    description: 'Admin name who reviewed the report',
    nullable: true,
  })
  reviewedByName?: string | null;
}

/**
 * Update Report Status DTO
 * 
 * DTO for updating report status (admin only).
 */
export class UpdateReportStatusDto {
  @ApiProperty({
    enum: ReportStatus,
    example: ReportStatus.RESOLVED,
    description: 'New status for the report',
  })
  @IsEnum(ReportStatus)
  @IsNotEmpty()
  status: ReportStatus;
}
