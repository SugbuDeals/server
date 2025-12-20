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
   * Creates a new report against a user or store.
   * Users cannot report themselves or their own stores.
   * 
   * @param req - Request object containing authenticated user information
   * @param createReportDto - Report data (reportedUserId or reportedStoreId, reason, optional description)
   * @returns Created report
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
   * @param skip - Number of records to skip
   * @param take - Number of records to take
   * @param status - Optional filter by status
   * @returns Array of reports
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
    description: 'Number of records to skip for pagination',
    example: 0,
  })
  @ApiQuery({
    name: 'take',
    required: false,
    type: Number,
    description: 'Number of records to return',
    example: 20,
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ReportStatus,
    description: 'Filter by report status',
  })
  @ApiOkResponse({
    description: 'Reports retrieved successfully',
    type: [ReportResponseDto],
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({ description: 'Forbidden - Admin access required' })
  async getAllReports(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('status') status?: ReportStatus,
  ): Promise<ReportResponseDto[]> {
    return this.reportService.getAllReports(
      skip ? parseInt(skip) : 0,
      take ? parseInt(take) : 20,
      status,
    );
  }

  /**
   * Gets a single report by ID (admin only).
   * 
   * @param id - Report ID
   * @returns Report details
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
   * @param req - Request object containing authenticated admin information
   * @param id - Report ID
   * @param updateReportStatusDto - New status
   * @returns Updated report
   */
  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Update report status (admin only)',
    description: 'Updates the status of a report. Admin access only.',
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
   * Use the 'type' parameter to specify whether to return reports submitted BY the user or reports ABOUT the user.
   * 
   * @param req - Request object containing authenticated user information
   * @param userId - User ID
   * @param type - Type of reports to retrieve: 'submitted' for reports submitted by the user (reporterId), 'received' for reports about the user (reportedUserId). Defaults to 'submitted'.
   * @param skip - Number of records to skip
   * @param take - Number of records to take
   * @returns Array of reports
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
    description: 'Number of records to skip for pagination',
    example: 0,
  })
  @ApiQuery({
    name: 'take',
    required: false,
    type: Number,
    description: 'Number of records to return',
    example: 20,
  })
  @ApiOkResponse({
    description: 'Reports retrieved successfully',
    type: [ReportResponseDto],
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({ description: 'Forbidden - Can only view own reports unless admin' })
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

    return this.reportService.getReportsByUser(
      userId,
      skip ? parseInt(skip) : 0,
      take ? parseInt(take) : 20,
      reportType,
    );
  }

  /**
   * Gets all reports for a specific store (admin only, or store owner viewing their store's reports).
   * 
   * @param req - Request object containing authenticated user information
   * @param storeId - Store ID
   * @param skip - Number of records to skip
   * @param take - Number of records to take
   * @returns Array of reports
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
    description: 'Number of records to skip for pagination',
    example: 0,
  })
  @ApiQuery({
    name: 'take',
    required: false,
    type: Number,
    description: 'Number of records to return',
    example: 20,
  })
  @ApiOkResponse({
    description: 'Reports retrieved successfully',
    type: [ReportResponseDto],
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({ description: 'Forbidden - Can only view own store reports unless admin' })
  @ApiNotFoundResponse({ description: 'Store not found' })
  async getReportsByStore(
    @Request() req: Request & { user: Omit<PayloadDTO, 'password'> },
    @Param('storeId', ParseIntPipe) storeId: number,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ): Promise<ReportResponseDto[]> {
    // Check if user is admin or store owner
    if (req.user.role !== UserRole.ADMIN) {
      const isOwner = await this.reportService.isStoreOwner(req.user.sub, storeId);
      if (!isOwner) {
        throw new ForbiddenException('You can only view reports for your own store');
      }
    }

    return this.reportService.getReportsByStore(
      storeId,
      skip ? parseInt(skip) : 0,
      take ? parseInt(take) : 20,
    );
  }
}
