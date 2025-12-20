import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateReportDto } from './dto/create-report.dto';
import { ReportResponseDto, UpdateReportStatusDto } from './dto/report-response.dto';
import { UserRole, ReportReason, ReportStatus } from 'generated/prisma';

/**
 * Report Service
 * 
 * Service responsible for handling report operations including:
 * - Creating reports against users or stores
 * - Retrieving reports (admin only)
 * - Updating report status (admin only)
 * - Getting reports by user or store
 */
@Injectable()
export class ReportService {
  private readonly logger = new Logger(ReportService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Creates a new report against a user or store.
   * Users cannot report themselves or their own stores.
   * 
   * @param reporterId - ID of the user creating the report
   * @param createReportDto - Report data (reportedUserId or reportedStoreId, reason, optional description)
   * @returns Created report
   * @throws {BadRequestException} If both or neither reportedUserId and reportedStoreId are provided
   * @throws {BadRequestException} If user tries to report themselves
   * @throws {BadRequestException} If retailer tries to report their own store
   * @throws {NotFoundException} If reported user or store doesn't exist
   */
  async createReport(reporterId: number, createReportDto: CreateReportDto): Promise<ReportResponseDto> {
    const { reportedUserId, reportedStoreId, reason, description } = createReportDto;

    // Validate that exactly one of reportedUserId or reportedStoreId is provided
    if ((reportedUserId && reportedStoreId) || (!reportedUserId && !reportedStoreId)) {
      throw new BadRequestException('Either reportedUserId or reportedStoreId must be provided, but not both');
    }

    // If reporting a user, check if user exists and is not the reporter
    if (reportedUserId) {
      if (reportedUserId === reporterId) {
        throw new BadRequestException('You cannot report yourself');
      }

      const reportedUser = await this.prisma.user.findUnique({
        where: { id: reportedUserId },
      });

      if (!reportedUser) {
        throw new NotFoundException(`User with ID ${reportedUserId} not found`);
      }
    }

    // If reporting a store, check if store exists and is not owned by the reporter
    if (reportedStoreId) {
      const reportedStore = await this.prisma.store.findUnique({
        where: { id: reportedStoreId },
        include: { owner: true },
      });

      if (!reportedStore) {
        throw new NotFoundException(`Store with ID ${reportedStoreId} not found`);
      }

      if (reportedStore.ownerId === reporterId) {
        throw new BadRequestException('You cannot report your own store');
      }
    }

    // Create the report
    const report = await this.prisma.report.create({
      data: {
        reporterId,
        reportedUserId: reportedUserId || null,
        reportedStoreId: reportedStoreId || null,
        reason,
        description: description || null,
        status: ReportStatus.PENDING,
      },
      include: {
        reporter: {
          select: {
            id: true,
            name: true,
          },
        },
        reportedUser: reportedUserId
          ? {
              select: {
                id: true,
                name: true,
              },
            }
          : false,
        reportedStore: reportedStoreId
          ? {
              select: {
                id: true,
                name: true,
              },
            }
          : false,
        reviewedBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    this.logger.log(
      `Report created: User ${reporterId} reported ${reportedUserId ? `user ${reportedUserId}` : `store ${reportedStoreId}`} for ${reason}`,
    );

    return this.mapReportToDto(report);
  }

  /**
   * Gets all reports with pagination (admin only).
   * 
   * Results are ordered by creation date (newest first).
   * 
   * @param skip - Number of records to skip for pagination (default: 0)
   * @param take - Number of records to return (default: 20)
   * @param status - Optional filter by report status (PENDING, REVIEWED, RESOLVED, DISMISSED)
   * @returns Array of report DTOs with full details including reporter, reported user/store, and reviewer information
   */
  async getAllReports(skip: number = 0, take: number = 20, status?: ReportStatus): Promise<ReportResponseDto[]> {
    const where = status ? { status } : {};

    const reports = await this.prisma.report.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        reporter: {
          select: {
            id: true,
            name: true,
          },
        },
        reportedUser: {
          select: {
            id: true,
            name: true,
          },
        },
        reportedStore: {
          select: {
            id: true,
            name: true,
          },
        },
        reviewedBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return reports.map((report) => this.mapReportToDto(report));
  }

  /**
   * Gets a single report by ID (admin only).
   * 
   * Retrieves a complete report with all related information including:
   * - Reporter details (ID and name)
   * - Reported user or store details (ID and name)
   * - Reviewer details (ID and name, if reviewed)
   * - Report metadata (status, timestamps, reason, description)
   * 
   * @param reportId - ID of the report to retrieve
   * @returns Report DTO with full details
   * @throws {NotFoundException} If report with the given ID doesn't exist
   */
  async getReport(reportId: number): Promise<ReportResponseDto> {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
      include: {
        reporter: {
          select: {
            id: true,
            name: true,
          },
        },
        reportedUser: {
          select: {
            id: true,
            name: true,
          },
        },
        reportedStore: {
          select: {
            id: true,
            name: true,
          },
        },
        reviewedBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!report) {
      throw new NotFoundException(`Report with ID ${reportId} not found`);
    }

    return this.mapReportToDto(report);
  }

  /**
   * Updates the status of a report (admin only).
   * 
   * Status transitions:
   * - When transitioning FROM PENDING to a reviewed status (REVIEWED, RESOLVED, DISMISSED):
   *   - Sets reviewedAt to current timestamp
   *   - Sets reviewedById to the admin's ID
   * - When changing status between reviewed states or back to PENDING:
   *   - Preserves existing reviewedAt and reviewedById values
   *   - This maintains review history for audit purposes
   * 
   * @param adminId - ID of the admin updating the report
   * @param reportId - ID of the report to update
   * @param updateReportStatusDto - DTO containing the new status (PENDING, REVIEWED, RESOLVED, or DISMISSED)
   * @returns Updated report DTO with full details
   * @throws {NotFoundException} If report with the given ID doesn't exist
   */
  async updateReportStatus(
    adminId: number,
    reportId: number,
    updateReportStatusDto: UpdateReportStatusDto,
  ): Promise<ReportResponseDto> {
    const { status } = updateReportStatusDto;

    // Check if report exists
    const existingReport = await this.prisma.report.findUnique({
      where: { id: reportId },
    });

    if (!existingReport) {
      throw new NotFoundException(`Report with ID ${reportId} not found`);
    }

    // Only set reviewedAt and reviewedById when transitioning FROM PENDING to a reviewed status
    // Preserve existing review history otherwise
    const isTransitioningFromPending = existingReport.status === ReportStatus.PENDING && status !== ReportStatus.PENDING;
    
    const updateData: {
      status: ReportStatus;
      reviewedAt: Date | null;
      reviewedById: number | null;
    } = {
      status,
      // Preserve existing review history unless transitioning from PENDING
      reviewedAt: isTransitioningFromPending ? new Date() : existingReport.reviewedAt,
      reviewedById: isTransitioningFromPending ? adminId : existingReport.reviewedById,
    };

    // Update the report
    const report = await this.prisma.report.update({
      where: { id: reportId },
      data: updateData,
      include: {
        reporter: {
          select: {
            id: true,
            name: true,
          },
        },
        reportedUser: {
          select: {
            id: true,
            name: true,
          },
        },
        reportedStore: {
          select: {
            id: true,
            name: true,
          },
        },
        reviewedBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    this.logger.log(`Report ${reportId} status updated to ${status} by admin ${adminId}`);

    return this.mapReportToDto(report);
  }

  /**
   * Gets all reports for a specific user.
   * 
   * Results are ordered by creation date (newest first).
   * 
   * @param userId - ID of the user
   * @param skip - Number of records to skip for pagination (default: 0)
   * @param take - Number of records to return (default: 20)
   * @param type - Type of reports to retrieve:
   *   - 'submitted': Reports submitted BY the user (where reporterId = userId)
   *   - 'received': Reports ABOUT the user (where reportedUserId = userId)
   *   Defaults to 'submitted'
   * @returns Array of report DTOs with full details including reporter, reported user/store, and reviewer information
   */
  async getReportsByUser(
    userId: number,
    skip: number = 0,
    take: number = 20,
    type: 'submitted' | 'received' = 'submitted',
  ): Promise<ReportResponseDto[]> {
    // Build where clause based on type
    const where: any = {};
    if (type === 'submitted') {
      // Reports submitted BY the user
      where.reporterId = userId;
    } else {
      // Reports ABOUT the user
      where.reportedUserId = userId;
    }

    const reports = await this.prisma.report.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        reporter: {
          select: {
            id: true,
            name: true,
          },
        },
        reportedUser: {
          select: {
            id: true,
            name: true,
          },
        },
        reportedStore: {
          select: {
            id: true,
            name: true,
          },
        },
        reviewedBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return reports.map((report) => this.mapReportToDto(report));
  }

  /**
   * Gets all reports for a specific store.
   * 
   * Results are ordered by creation date (newest first).
   * 
   * @param storeId - ID of the store to get reports for
   * @param skip - Number of records to skip for pagination (default: 0)
   * @param take - Number of records to return (default: 20)
   * @returns Array of report DTOs with full details including reporter, reported store, and reviewer information
   */
  async getReportsByStore(storeId: number, skip: number = 0, take: number = 20): Promise<ReportResponseDto[]> {
    const reports = await this.prisma.report.findMany({
      where: { reportedStoreId: storeId },
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        reporter: {
          select: {
            id: true,
            name: true,
          },
        },
        reportedUser: {
          select: {
            id: true,
            name: true,
          },
        },
        reportedStore: {
          select: {
            id: true,
            name: true,
          },
        },
        reviewedBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return reports.map((report) => this.mapReportToDto(report));
  }

  /**
   * Checks if a store exists.
   * 
   * Used to validate store existence before performing operations that require
   * a valid store. This ensures proper error handling (404 Not Found) rather
   * than generic errors.
   * 
   * @param storeId - ID of the store to check
   * @throws {NotFoundException} If store with the given ID doesn't exist
   */
  async checkStoreExists(storeId: number): Promise<void> {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: { id: true },
    });

    if (!store) {
      throw new NotFoundException(`Store with ID ${storeId} not found`);
    }
  }

  /**
   * Checks if a user owns a store.
   * 
   * Note: This method returns false if the store doesn't exist. For proper error
   * handling, use checkStoreExists() first to ensure the store exists before
   * checking ownership.
   * 
   * @param userId - ID of the user to check ownership for
   * @param storeId - ID of the store to check
   * @returns True if user owns the store, false otherwise (including if store doesn't exist)
   */
  async isStoreOwner(userId: number, storeId: number): Promise<boolean> {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: { ownerId: true },
    });

    return store?.ownerId === userId;
  }

  /**
   * Maps a Prisma report object to ReportResponseDto.
   * 
   * Transforms the database model into a DTO suitable for API responses.
   * Handles optional relations (reporter, reportedUser, reportedStore, reviewedBy)
   * and ensures null values are properly set.
   * 
   * @param report - Prisma report object with optional relations (reporter, reportedUser, reportedStore, reviewedBy)
   * @returns ReportResponseDto with all fields properly mapped, including optional name fields from relations
   */
  private mapReportToDto(report: {
    id: number;
    reporterId: number;
    reportedUserId: number | null;
    reportedStoreId: number | null;
    reason: ReportReason;
    description: string | null;
    status: ReportStatus;
    createdAt: Date;
    reviewedAt: Date | null;
    reviewedById: number | null;
    reporter?: { id: number; name: string } | null;
    reportedUser?: { id: number; name: string } | null;
    reportedStore?: { id: number; name: string } | null;
    reviewedBy?: { id: number; name: string } | null;
  }): ReportResponseDto {
    return {
      id: report.id,
      reporterId: report.reporterId,
      reporterName: report.reporter?.name,
      reportedUserId: report.reportedUserId,
      reportedUserName: report.reportedUser?.name || null,
      reportedStoreId: report.reportedStoreId,
      reportedStoreName: report.reportedStore?.name || null,
      reason: report.reason,
      description: report.description,
      status: report.status,
      createdAt: report.createdAt,
      reviewedAt: report.reviewedAt,
      reviewedById: report.reviewedById,
      reviewedByName: report.reviewedBy?.name || null,
    };
  }
}
