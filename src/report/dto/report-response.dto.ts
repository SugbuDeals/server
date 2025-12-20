import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { ReportReason, ReportStatus } from 'generated/prisma';

/**
 * Report Response DTO
 * 
 * Response DTO for report data returned by all report endpoints.
 * Contains complete report information including related entities (reporter, reported user/store, reviewer).
 * 
 * **Note:** Either `reportedUserId` or `reportedStoreId` will be set (not both), depending on whether
 * the report is about a user or a store.
 */
export class ReportResponseDto {
  @ApiProperty({ 
    example: 1, 
    description: 'Unique report identifier',
    type: Number,
  })
  id: number;

  @ApiProperty({ 
    example: 1, 
    description: 'User ID who created/submitted the report',
    type: Number,
  })
  reporterId: number;

  @ApiPropertyOptional({ 
    example: 'John Doe', 
    description: 'Name of the user who created the report',
    type: String,
  })
  reporterName?: string;

  @ApiPropertyOptional({ 
    example: 1, 
    description: 'User ID being reported (nullable - only set when reporting a consumer/user). Will be null if reporting a store.',
    nullable: true,
    type: Number,
  })
  reportedUserId: number | null;

  @ApiPropertyOptional({ 
    example: 'Jane Doe', 
    description: 'Name of the user being reported (only set when reporting a user)',
    nullable: true,
    type: String,
  })
  reportedUserName?: string | null;

  @ApiPropertyOptional({ 
    example: 1, 
    description: 'Store ID being reported (nullable - only set when reporting a store/retailer). Will be null if reporting a user.',
    nullable: true,
    type: Number,
  })
  reportedStoreId: number | null;

  @ApiPropertyOptional({ 
    example: 'Electronics Store', 
    description: 'Name of the store being reported (only set when reporting a store)',
    nullable: true,
    type: String,
  })
  reportedStoreName?: string | null;

  @ApiProperty({
    enum: ReportReason,
    enumName: 'ReportReason',
    example: ReportReason.SPAM,
    description: 'Reason for the report. Valid values: SPAM, HARASSMENT, INAPPROPRIATE_CONTENT, FAKE_REVIEW, SCAM, OTHER.',
    type: String,
  })
  reason: ReportReason;

  @ApiPropertyOptional({
    example: 'This user is posting spam messages repeatedly.',
    description: 'Additional details about the report provided by the reporter',
    nullable: true,
    type: String,
  })
  description: string | null;

  @ApiProperty({
    enum: ReportStatus,
    enumName: 'ReportStatus',
    example: ReportStatus.PENDING,
    description: 'Current status of the report. Valid values: PENDING (awaiting review), REVIEWED (under review), RESOLVED (action taken), DISMISSED (no action needed).',
    type: String,
  })
  status: ReportStatus;

  @ApiProperty({
    example: '2024-01-01T00:00:00.000Z',
    description: 'Timestamp when the report was created',
    type: String,
    format: 'date-time',
  })
  createdAt: Date;

  @ApiPropertyOptional({
    example: '2024-01-02T00:00:00.000Z',
    description: 'Timestamp when the report was reviewed by an admin. Only set when status changes from PENDING to a reviewed status (REVIEWED, RESOLVED, or DISMISSED). Preserved when status changes between reviewed states.',
    type: String,
    format: 'date-time',
    nullable: true,
  })
  reviewedAt: Date | null;

  @ApiPropertyOptional({
    example: 1,
    description: 'Admin user ID who reviewed the report. Only set when status changes from PENDING to a reviewed status. Preserved when status changes between reviewed states.',
    nullable: true,
    type: Number,
  })
  reviewedById: number | null;

  @ApiPropertyOptional({
    example: 'Admin User',
    description: 'Name of the admin who reviewed the report',
    nullable: true,
    type: String,
  })
  reviewedByName?: string | null;
}

/**
 * Update Report Status DTO
 * 
 * DTO for updating report status (admin only).
 * 
 * **Status Transition Behavior:**
 * - When changing from PENDING to a reviewed status (REVIEWED, RESOLVED, DISMISSED):
 *   - `reviewedAt` is automatically set to the current timestamp
 *   - `reviewedById` is automatically set to the admin's ID
 * - When changing between reviewed states or back to PENDING:
 *   - Existing `reviewedAt` and `reviewedById` values are preserved
 *   - This maintains audit trail and review history
 */
export class UpdateReportStatusDto {
  @ApiProperty({
    enum: ReportStatus,
    enumName: 'ReportStatus',
    example: ReportStatus.RESOLVED,
    description: 'New status for the report. Valid values: PENDING, REVIEWED, RESOLVED, DISMISSED.',
    type: String,
  })
  @IsEnum(ReportStatus)
  @IsNotEmpty()
  status: ReportStatus;
}
