import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
  ParseIntPipe,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiParam,
  ApiQuery,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { ReportService } from './report.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { CreateReportDto } from './dto/create-report.dto';
import { ReportResponseDto, UpdateReportStatusDto } from './dto/report-response.dto';
import { PayloadDTO } from 'src/auth/dto/payload.dto';
import { UserRole, ReportStatus } from 'generated/prisma';

/**
 * Report Controller
 * 
 * Handles HTTP requests for report operations.
 * Provides endpoints for creating reports against users or stores,
 * and managing reports (admin only).
 * 
 * Access Control:
 * - All authenticated users can create reports
 * - Only admins can view all reports and update report status
 * - Users can view reports for their own stores (retailers) or themselves (consumers)
 */
@ApiTags('Reports')
@Controller('reports')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  /**
   * Validates and parses pagination parameters.
   * 
   * @param skip - Optional skip parameter as string
   * @param take - Optional take parameter as string
   * @returns Object with validated skip and take numbers
   * @throws {BadRequestException} If parameters are invalid (NaN, negative, or out of range)
   */
  private validatePaginationParams(skip?: string, take?: string): { skip: number; take: number } {
    const skipNum = skip ? parseInt(skip, 10) : 0;
    const takeNum = take ? parseInt(take, 10) : 20;

    if (isNaN(skipNum) || skipNum < 0) {
      throw new BadRequestException('skip must be a non-negative integer');
    }

    if (isNaN(takeNum) || takeNum < 1 || takeNum > 100) {
      throw new BadRequestException('take must be an integer between 1 and 100');
    }

    return { skip: skipNum, take: takeNum };
  }

  /**
   * Creates a new report against a user or store.
   * 
   * Allows authenticated users to report inappropriate behavior from consumers (users) or retailers (stores).
   * The report is created with PENDING status and awaits admin review.
   * 
   * **Validation:**
   * - Exactly one of `reportedUserId` or `reportedStoreId` must be provided
   * - Users cannot report themselves
   * - Store owners cannot report their own stores
   * - The reported user or store must exist
   * 
   * @param req - Request object containing authenticated user information (from JWT token)
   * @param createReportDto - Report data containing either reportedUserId or reportedStoreId, reason, and optional description
   * @returns Created report with full details including reporter and reported entity information
   * @throws {BadRequestException} If validation fails (both/neither IDs provided, self-report, own store report)
   * @throws {NotFoundException} If reported user or store doesn't exist
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Create a report',
    description: 'Creates a new report against a user (consumer) or store (retailer). Users cannot report themselves or their own stores.',
  })
  @ApiCreatedResponse({
    description: 'Report created successfully',
    type: ReportResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiBadRequestResponse({ description: 'Bad request - Invalid data or trying to report self/own store' })
  @ApiNotFoundResponse({ description: 'Reported user or store not found' })
  async createReport(
    @Request() req: Request & { user: Omit<PayloadDTO, 'password'> },
    @Body() createReportDto: CreateReportDto,
  ): Promise<ReportResponseDto> {
    return this.reportService.createReport(req.user.sub, createReportDto);
  }

  /**
   * Gets all reports with pagination (admin only).
   * 
   * Retrieves all reports in the system with optional filtering by status.
   * Results are ordered by creation date (newest first).
   * 
   * **Pagination:**
   * - `skip`: Must be >= 0 (default: 0)
   * - `take`: Must be between 1 and 100 (default: 20)
   * 
   * @param skip - Number of records to skip for pagination (validated: must be >= 0)
   * @param take - Number of records to return (validated: must be 1-100)
   * @param status - Optional filter by report status (PENDING, REVIEWED, RESOLVED, DISMISSED)
   * @returns Array of report DTOs with full details
   * @throws {BadRequestException} If pagination parameters are invalid
   */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Get all reports (admin only)',
    description: 'Retrieves all reports with pagination. Optionally filtered by status. Admin access only.',
  })
  @ApiQuery({
    name: 'skip',
    required: false,
    type: Number,
    description: 'Number of records to skip for pagination. Must be a non-negative integer. Defaults to 0.',
    example: 0,
  })
  @ApiQuery({
    name: 'take',
    required: false,
    type: Number,
    description: 'Number of records to return. Must be an integer between 1 and 100. Defaults to 20.',
    example: 20,
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ReportStatus,
    description: 'Filter by report status. Valid values: PENDING, REVIEWED, RESOLVED, DISMISSED.',
    example: ReportStatus.PENDING,
  })
  @ApiOkResponse({
    description: 'Reports retrieved successfully',
    type: [ReportResponseDto],
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({ description: 'Forbidden - Admin access required' })
  @ApiBadRequestResponse({ description: 'Bad request - Invalid pagination parameters (skip must be >= 0, take must be between 1 and 100)' })
  async getAllReports(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('status') status?: ReportStatus,
  ): Promise<ReportResponseDto[]> {
    const { skip: skipNum, take: takeNum } = this.validatePaginationParams(skip, take);
    return this.reportService.getAllReports(skipNum, takeNum, status);
  }

  /**
   * Gets a single report by ID (admin only).
   * 
   * Retrieves complete details of a specific report including:
   * - Reporter information (ID and name)
   * - Reported entity information (user or store ID and name)
   * - Reviewer information (ID and name, if reviewed)
   * - Report metadata (status, timestamps, reason, description)
   * 
   * @param id - Report ID (validated as integer via ParseIntPipe)
   * @returns Report DTO with full details
   * @throws {NotFoundException} If report with the given ID doesn't exist
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Get a report (admin only)',
    description: 'Retrieves a single report by ID. Admin access only.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Report ID',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Report retrieved successfully',
    type: ReportResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({ description: 'Forbidden - Admin access required' })
  @ApiNotFoundResponse({ description: 'Report not found' })
  async getReport(@Param('id', ParseIntPipe) id: number): Promise<ReportResponseDto> {
    return this.reportService.getReport(id);
  }

  /**
   * Updates the status of a report (admin only).
   * 
   * Allows admins to change report status and manage the review process.
   * 
   * **Status Transition Behavior:**
   * - When transitioning FROM PENDING to a reviewed status (REVIEWED, RESOLVED, DISMISSED):
   *   - Automatically sets `reviewedAt` to current timestamp
   *   - Automatically sets `reviewedById` to the admin's ID
   * - When changing between reviewed states or back to PENDING:
   *   - Preserves existing `reviewedAt` and `reviewedById` values
   *   - Maintains audit trail and review history
   * 
   * @param req - Request object containing authenticated admin information (from JWT token)
   * @param id - Report ID to update (validated as integer via ParseIntPipe)
   * @param updateReportStatusDto - DTO containing the new status (PENDING, REVIEWED, RESOLVED, or DISMISSED)
   * @returns Updated report DTO with full details
   * @throws {NotFoundException} If report with the given ID doesn't exist
   */
  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Update report status (admin only)',
    description: 'Updates the status of a report. Admin access only. When transitioning from PENDING to a reviewed status (REVIEWED, RESOLVED, or DISMISSED), the review timestamp and reviewer ID are automatically set. Review history is preserved when changing status between reviewed states or back to PENDING.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Report ID',
    example: 1,
  })
  @ApiOkResponse({
    description: 'Report status updated successfully',
    type: ReportResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({ description: 'Forbidden - Admin access required' })
  @ApiNotFoundResponse({ description: 'Report not found' })
  async updateReportStatus(
    @Request() req: Request & { user: Omit<PayloadDTO, 'password'> },
    @Param('id', ParseIntPipe) id: number,
    @Body() updateReportStatusDto: UpdateReportStatusDto,
  ): Promise<ReportResponseDto> {
    return this.reportService.updateReportStatus(req.user.sub, id, updateReportStatusDto);
  }

  /**
   * Gets all reports for a specific user (admin only, or user viewing their own reports).
   * 
   * Allows users to view reports they've submitted or reports made about them.
   * Admins can view reports for any user.
   * 
   * **Access Control:**
   * - Admins can view reports for any user
   * - Regular users can only view their own reports
   * 
   * **Report Types:**
   * - `submitted`: Reports submitted BY the user (where reporterId = userId)
   * - `received`: Reports ABOUT the user (where reportedUserId = userId)
   * 
   * **Pagination:**
   * - `skip`: Must be >= 0 (default: 0)
   * - `take`: Must be between 1 and 100 (default: 20)
   * 
   * Results are ordered by creation date (newest first).
   * 
   * @param req - Request object containing authenticated user information (from JWT token)
   * @param userId - User ID to get reports for (validated as integer via ParseIntPipe)
   * @param type - Type of reports: 'submitted' (reports by user) or 'received' (reports about user). Defaults to 'submitted'
   * @param skip - Number of records to skip for pagination (validated: must be >= 0)
   * @param take - Number of records to return (validated: must be 1-100)
   * @returns Array of report DTOs with full details
   * @throws {ForbiddenException} If user tries to view another user's reports (unless admin)
   * @throws {BadRequestException} If pagination parameters are invalid
   */
  @Get('user/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Get reports for a user',
    description: 'Retrieves reports for a specific user. Use the \'type\' parameter to specify whether to return reports submitted BY the user or reports ABOUT the user. Admins can view any user\'s reports, users can only view their own reports.',
  })
  @ApiParam({
    name: 'userId',
    type: Number,
    description: 'User ID',
    example: 1,
  })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['submitted', 'received'],
    description: 'Type of reports to retrieve: \'submitted\' for reports submitted by the user (reporterId), \'received\' for reports about the user (reportedUserId). Defaults to \'submitted\'.',
    example: 'submitted',
  })
  @ApiQuery({
    name: 'skip',
    required: false,
    type: Number,
    description: 'Number of records to skip for pagination. Must be a non-negative integer. Defaults to 0.',
    example: 0,
  })
  @ApiQuery({
    name: 'take',
    required: false,
    type: Number,
    description: 'Number of records to return. Must be an integer between 1 and 100. Defaults to 20.',
    example: 20,
  })
  @ApiOkResponse({
    description: 'Reports retrieved successfully',
    type: [ReportResponseDto],
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({ description: 'Forbidden - Can only view own reports unless admin' })
  @ApiBadRequestResponse({ description: 'Bad request - Invalid pagination parameters (skip must be >= 0, take must be between 1 and 100)' })
  async getReportsByUser(
    @Request() req: Request & { user: Omit<PayloadDTO, 'password'> },
    @Param('userId', ParseIntPipe) userId: number,
    @Query('type') type?: 'submitted' | 'received',
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ): Promise<ReportResponseDto[]> {
    // Users can only view their own reports unless they're admins
    if (req.user.role !== UserRole.ADMIN && req.user.sub !== userId) {
      throw new ForbiddenException('You can only view your own reports');
    }

    // Validate type parameter
    const reportType = type === 'received' ? 'received' : 'submitted';

    const { skip: skipNum, take: takeNum } = this.validatePaginationParams(skip, take);

    return this.reportService.getReportsByUser(
      userId,
      skipNum,
      takeNum,
      reportType,
    );
  }

  /**
   * Gets all reports for a specific store (admin only, or store owner viewing their store's reports).
   * 
   * Allows store owners to view reports made about their stores.
   * Admins can view reports for any store.
   * 
   * **Access Control:**
   * - Admins can view reports for any store
   * - Store owners can only view reports for their own stores
   * 
   * **Pagination:**
   * - `skip`: Must be >= 0 (default: 0)
   * - `take`: Must be between 1 and 100 (default: 20)
   * 
   * Results are ordered by creation date (newest first).
   * 
   * @param req - Request object containing authenticated user information (from JWT token)
   * @param storeId - Store ID to get reports for (validated as integer via ParseIntPipe)
   * @param skip - Number of records to skip for pagination (validated: must be >= 0)
   * @param take - Number of records to return (validated: must be 1-100)
   * @returns Array of report DTOs with full details
   * @throws {NotFoundException} If store with the given ID doesn't exist
   * @throws {ForbiddenException} If user tries to view reports for a store they don't own (unless admin)
   * @throws {BadRequestException} If pagination parameters are invalid
   */
  @Get('store/:storeId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Get reports for a store',
    description: 'Retrieves all reports for a specific store. Admins can view any store\'s reports, store owners can view their own store\'s reports.',
  })
  @ApiParam({
    name: 'storeId',
    type: Number,
    description: 'Store ID',
    example: 1,
  })
  @ApiQuery({
    name: 'skip',
    required: false,
    type: Number,
    description: 'Number of records to skip for pagination. Must be a non-negative integer. Defaults to 0.',
    example: 0,
  })
  @ApiQuery({
    name: 'take',
    required: false,
    type: Number,
    description: 'Number of records to return. Must be an integer between 1 and 100. Defaults to 20.',
    example: 20,
  })
  @ApiOkResponse({
    description: 'Reports retrieved successfully',
    type: [ReportResponseDto],
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({ description: 'Forbidden - Can only view own store reports unless admin' })
  @ApiNotFoundResponse({ description: 'Store not found - Store with the provided ID does not exist' })
  @ApiBadRequestResponse({ description: 'Bad request - Invalid pagination parameters (skip must be >= 0, take must be between 1 and 100)' })
  async getReportsByStore(
    @Request() req: Request & { user: Omit<PayloadDTO, 'password'> },
    @Param('storeId', ParseIntPipe) storeId: number,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ): Promise<ReportResponseDto[]> {
    // Check if store exists first (throws NotFoundException if not found)
    await this.reportService.checkStoreExists(storeId);

    // Check if user is admin or store owner
    if (req.user.role !== UserRole.ADMIN) {
      const isOwner = await this.reportService.isStoreOwner(req.user.sub, storeId);
      if (!isOwner) {
        throw new ForbiddenException('You can only view reports for your own store');
      }
    }

    const { skip: skipNum, take: takeNum } = this.validatePaginationParams(skip, take);

    return this.reportService.getReportsByStore(
      storeId,
      skipNum,
      takeNum,
    );
  }
}
