import {
  Controller,
  Get,
  Post,
  Query,
  Param,
  UseGuards,
  Request,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'generated/prisma';
import { MonitoringService } from './monitoring.service';
import { MonitoringQueryDto } from './dto/monitoring-query.dto';
import { ErrorLogResponseDto } from './dto/error-log-response.dto';
import { PerformanceMetricResponseDto } from './dto/performance-metric-response.dto';
import { DashboardStatsDto } from './dto/dashboard-stats.dto';
import { PayloadDTO } from 'src/auth/dto/payload.dto';
import { TestPerformanceResponseDto, TestErrorResponseDto } from './dto/test-response.dto';
import { RouteTrackingService } from './services/route-tracking.service';
import { RouteStatDto, RouteSummaryDto } from './dto/route-monitoring.dto';

/**
 * Monitoring Controller
 * 
 * Admin-only endpoints for monitoring system performance and errors.
 * Provides access to error logs, performance metrics, and dashboard statistics.
 */
@ApiTags('Monitoring')
@Controller('monitoring')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth('bearer')
export class MonitoringController {
  constructor(
    private monitoringService: MonitoringService,
    private routeTrackingService: RouteTrackingService,
  ) {}

  /**
   * Get error logs with filtering and pagination
   * 
   * Returns ALL errors and warnings logged by the system, including:
   * - 401 Unauthorized errors
   * - 403 Forbidden errors
   * - 404 Not Found errors
   * - 500 Internal Server Errors
   * - All other HTTP errors and exceptions
   * 
   * Errors are categorized by level:
   * - 'error': Status codes >= 500 (server errors)
   * - 'warn': Status codes < 500 (client errors like 401, 403, 404, etc.)
   */
  @Get('errors')
  @ApiOperation({
    summary: 'Get error logs (Admin only)',
    description: 'Retrieves ALL error logs (including 401s, 403s, 404s, 500s, etc.) with optional filtering by time range, endpoint, method, and level. Supports pagination. By default, returns both "error" and "warn" level logs.',
  })
  @ApiQuery({ name: 'level', required: false, enum: ['error', 'warn', 'debug'], description: 'Filter by error level' })
  @ApiOkResponse({
    description: 'Returns paginated error logs',
    type: [ErrorLogResponseDto],
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({ description: 'Forbidden - Only admins can access monitoring data' })
  async getErrorLogs(@Query() query: MonitoringQueryDto) {
    return this.monitoringService.getErrorLogs(query);
  }

  /**
   * Get error statistics
   */
  @Get('errors/stats')
  @ApiOperation({
    summary: 'Get error statistics (Admin only)',
    description: 'Returns aggregated error statistics including counts, top error endpoints, and errors by status code.',
  })
  @ApiQuery({ name: 'timeRange', required: false, enum: ['hour', 'day', 'week', 'month'] })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiOkResponse({
    description: 'Returns error statistics',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({ description: 'Forbidden - Only admins can access monitoring data' })
  async getErrorStats(
    @Query('timeRange') timeRange?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.monitoringService.getErrorStats(
      timeRange as any,
      startDate,
      endDate,
    );
  }

  /**
   * Get performance metrics with filtering and pagination
   */
  @Get('performance')
  @ApiOperation({
    summary: 'Get performance metrics (Admin only)',
    description: 'Retrieves performance metrics with optional filtering by time range, endpoint, and method. Supports pagination.',
  })
  @ApiOkResponse({
    description: 'Returns paginated performance metrics',
    type: [PerformanceMetricResponseDto],
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({ description: 'Forbidden - Only admins can access monitoring data' })
  async getPerformanceMetrics(@Query() query: MonitoringQueryDto) {
    return this.monitoringService.getPerformanceMetrics(query);
  }

  /**
   * Get performance statistics
   */
  @Get('performance/stats')
  @ApiOperation({
    summary: 'Get performance statistics (Admin only)',
    description: 'Returns aggregated performance statistics including average response times, slowest endpoints, and request counts by status code.',
  })
  @ApiQuery({ name: 'timeRange', required: false, enum: ['hour', 'day', 'week', 'month'] })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiOkResponse({
    description: 'Returns performance statistics',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({ description: 'Forbidden - Only admins can access monitoring data' })
  async getPerformanceStats(
    @Query('timeRange') timeRange?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.monitoringService.getPerformanceStats(
      timeRange as any,
      startDate,
      endDate,
    );
  }

  /**
   * Get dashboard statistics (combined errors and performance)
   */
  @Get('dashboard')
  @ApiOperation({
    summary: 'Get dashboard statistics (Admin only)',
    description: 'Returns combined error and performance statistics for the admin dashboard. Provides a comprehensive overview of system health.',
  })
  @ApiQuery({ name: 'timeRange', required: false, enum: ['hour', 'day', 'week', 'month'] })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiOkResponse({
    description: 'Returns dashboard statistics',
    type: DashboardStatsDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({ description: 'Forbidden - Only admins can access monitoring data' })
  async getDashboardStats(
    @Query('timeRange') timeRange?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.monitoringService.getDashboardStats(
      timeRange as any,
      startDate,
      endDate,
    );
  }

  /**
   * Test endpoint for performance monitoring
   * Simulates various response times across different routes to test performance tracking
   */
  @Post('test/performance')
  @ApiOperation({
    summary: 'Test performance monitoring (Admin only)',
    description: 'Generates test performance metrics with various response times across different routes. Useful for testing the monitoring system. Can test single route or multiple routes.',
  })
  @ApiQuery({ name: 'responseTime', required: false, type: Number, description: 'Response time in milliseconds (default: 200). Ignored if route=all.' })
  @ApiQuery({ name: 'route', required: false, enum: ['auth/login', 'auth/register', 'user', 'product', 'store', 'promotion', 'category', 'bookmark', 'view', 'ai/chat', 'subscription', 'notification', 'file', 'all'], description: 'Route to test (default: monitoring/test/performance). Use "all" to test multiple routes.' })
  @ApiOkResponse({
    description: 'Test performance metric created successfully',
    type: TestPerformanceResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({ description: 'Forbidden - Only admins can access monitoring data' })
  async testPerformance(
    @Request() req: Request & { user: Omit<PayloadDTO, 'password'> },
    @Query('responseTime') responseTime?: string,
    @Query('route') route?: string,
  ) {
    const routes = {
      'auth/login': { path: '/auth/login', method: 'POST', baseTime: 150 },
      'auth/register': { path: '/auth/register', method: 'POST', baseTime: 200 },
      'user': { path: '/user', method: 'GET', baseTime: 100 },
      'product': { path: '/product', method: 'GET', baseTime: 180 },
      'store': { path: '/store', method: 'GET', baseTime: 160 },
      'promotion': { path: '/promotion', method: 'GET', baseTime: 170 },
      'category': { path: '/category', method: 'GET', baseTime: 120 },
      'bookmark': { path: '/bookmarks', method: 'GET', baseTime: 140 },
      'view': { path: '/views', method: 'GET', baseTime: 130 },
      'ai/chat': { path: '/ai/chat', method: 'POST', baseTime: 500 },
      'subscription': { path: '/subscription/me', method: 'GET', baseTime: 110 },
      'notification': { path: '/notifications', method: 'GET', baseTime: 150 },
      'file': { path: '/files', method: 'GET', baseTime: 200 },
    };

    const testRoute = route || 'monitoring/test/performance';
    const results: any[] = [];

    if (route === 'all') {
      // Test all routes with varying response times
      for (const [routeKey, routeInfo] of Object.entries(routes)) {
        // Add some variance to response times (±20%)
        const variance = routeInfo.baseTime * 0.2;
        const randomVariance = (Math.random() * 2 - 1) * variance;
        const delay = Math.max(50, Math.round(routeInfo.baseTime + randomVariance));
        
        await new Promise((resolve) => setTimeout(resolve, delay));
        
        results.push({
          route: routeInfo.path,
          method: routeInfo.method,
          responseTime: delay,
        });
      }

      return {
        message: 'Performance test completed for all routes',
        routes: results,
        totalRoutes: results.length,
        avgResponseTime: Math.round(results.reduce((sum, r) => sum + r.responseTime, 0) / results.length),
        timestamp: new Date().toISOString(),
        userId: req.user.sub,
      };
    } else {
      // Test single route
      const routeInfo = routes[testRoute as keyof typeof routes];
      const delay = responseTime 
        ? parseInt(responseTime, 10) 
        : routeInfo 
          ? routeInfo.baseTime 
          : 200;
      
      // Simulate processing time
      await new Promise((resolve) => setTimeout(resolve, delay));
      
      return {
        message: 'Performance test completed',
        route: routeInfo ? routeInfo.path : testRoute,
        method: routeInfo ? routeInfo.method : 'POST',
        simulatedResponseTime: delay,
        timestamp: new Date().toISOString(),
        userId: req.user.sub,
      };
    }
  }

  /**
   * Test endpoint for error monitoring
   * Generates test errors to verify error tracking works correctly
   * Supports various error types: 400, 401, 403, 404, 409, 422, 500, 502, 503
   */
  @Post('test/error')
  @ApiOperation({
    summary: 'Test error monitoring (Admin only)',
    description: 'Generates test errors to verify error tracking. Supports various HTTP status codes: 400 (Bad Request), 401 (Unauthorized), 403 (Forbidden), 404 (Not Found), 409 (Conflict), 422 (Unprocessable Entity), 500 (Internal Server Error), 502 (Bad Gateway), 503 (Service Unavailable). Use errorType=all to test multiple error types.',
  })
  @ApiQuery({ name: 'statusCode', required: false, type: Number, description: 'HTTP status code (default: 500). Ignored if errorType=all.' })
  @ApiQuery({ name: 'errorType', required: false, enum: ['error', 'warn', 'all'], description: 'Error level (default: error). Use "all" to test multiple error types.' })
  @ApiOkResponse({
    description: 'Test error generated successfully (will return error response)',
    type: TestErrorResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({ description: 'Forbidden - Only admins can access monitoring data' })
  async testError(
    @Request() req: Request & { user: Omit<PayloadDTO, 'password'> },
    @Query('statusCode') statusCode?: string,
    @Query('errorType') errorType?: 'error' | 'warn' | 'all',
  ) {
    const errorTypes = [
      { code: 400, message: 'Bad Request - Invalid input parameters', level: 'warn' },
      { code: 401, message: 'Unauthorized - Authentication required', level: 'warn' },
      { code: 403, message: 'Forbidden - Insufficient permissions', level: 'warn' },
      { code: 404, message: 'Not Found - Resource does not exist', level: 'warn' },
      { code: 409, message: 'Conflict - Resource already exists', level: 'warn' },
      { code: 422, message: 'Unprocessable Entity - Validation failed', level: 'warn' },
      { code: 500, message: 'Internal Server Error - Unexpected server error', level: 'error' },
      { code: 502, message: 'Bad Gateway - Upstream server error', level: 'error' },
      { code: 503, message: 'Service Unavailable - Service temporarily unavailable', level: 'error' },
    ];

    if (errorType === 'all') {
      // Test all error types sequentially
      const results: any[] = [];
      
      for (const errorInfo of errorTypes) {
        // Note: This will throw the first error, but we're documenting what would be tested
        // In a real scenario, you might want to log these instead of throwing
        results.push({
          statusCode: errorInfo.code,
          message: errorInfo.message,
          level: errorInfo.level,
        });
      }

      // Throw the last error (500) to demonstrate error tracking
      // In practice, you might want to create a separate endpoint that logs without throwing
      throw new HttpException(
        {
          message: 'Test errors generated - Multiple error types tested',
          statusCode: 500,
          test: true,
          testedErrors: results,
          userId: req.user.sub,
          timestamp: new Date().toISOString(),
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    } else {
      // Test single error type
      const code = statusCode ? parseInt(statusCode, 10) : 500;
      const level = errorType || (code >= 500 ? 'error' : 'warn');
      
      const errorInfo = errorTypes.find(e => e.code === code);
      const message = errorInfo 
        ? errorInfo.message 
        : `Test ${level} - This is a test error for monitoring verification`;
      
      // Throw an exception that will be caught by the exception filter
      throw new HttpException(
        {
          message,
          statusCode: code,
          test: true,
          userId: req.user.sub,
          timestamp: new Date().toISOString(),
        },
        code,
      );
    }
  }

  /**
   * Test endpoint for 400 Bad Request errors
   * Generates a 400 error to test validation error tracking
   */
  @Post('test/bad-request')
  @ApiOperation({
    summary: 'Test 400 Bad Request error tracking (Admin only)',
    description: 'Generates a 400 Bad Request error to test validation error tracking.',
  })
  @ApiOkResponse({
    description: 'Test bad request error generated successfully (will return 400 error)',
    type: TestErrorResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({ description: 'Forbidden - Only admins can access monitoring data' })
  async testBadRequest(
    @Request() req: Request & { user: Omit<PayloadDTO, 'password'> },
  ) {
    throw new HttpException(
      {
        message: 'Test Bad Request error - This is a test 400 error for monitoring verification',
        statusCode: 400,
        test: true,
        userId: req.user.sub,
        timestamp: new Date().toISOString(),
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  /**
   * Test endpoint for 401 Unauthorized errors
   * Generates a 401 error to test authentication error tracking
   */
  @Post('test/unauthorized')
  @ApiOperation({
    summary: 'Test 401 Unauthorized error tracking (Admin only)',
    description: 'Generates a 401 Unauthorized error to test authentication error tracking.',
  })
  @ApiOkResponse({
    description: 'Test unauthorized error generated successfully (will return 401 error)',
    type: TestErrorResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - This is the test error' })
  @ApiForbiddenResponse({ description: 'Forbidden - Only admins can access monitoring data' })
  async testUnauthorized(
    @Request() req: Request & { user: Omit<PayloadDTO, 'password'> },
  ) {
    throw new HttpException(
      {
        message: 'Test Unauthorized error - This is a test 401 error for monitoring verification',
        statusCode: 401,
        test: true,
        userId: req.user.sub,
        timestamp: new Date().toISOString(),
      },
      HttpStatus.UNAUTHORIZED,
    );
  }

  /**
   * Test endpoint for 403 Forbidden errors
   * Generates a 403 error to test authorization error tracking
   */
  @Post('test/forbidden')
  @ApiOperation({
    summary: 'Test 403 Forbidden error tracking (Admin only)',
    description: 'Generates a 403 Forbidden error to test authorization error tracking.',
  })
  @ApiOkResponse({
    description: 'Test forbidden error generated successfully (will return 403 error)',
    type: TestErrorResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({ description: 'Forbidden - This is the test error' })
  async testForbidden(
    @Request() req: Request & { user: Omit<PayloadDTO, 'password'> },
  ) {
    throw new HttpException(
      {
        message: 'Test Forbidden error - This is a test 403 error for monitoring verification',
        statusCode: 403,
        test: true,
        userId: req.user.sub,
        timestamp: new Date().toISOString(),
      },
      HttpStatus.FORBIDDEN,
    );
  }

  /**
   * Test endpoint for 404 Not Found errors
   * Generates a 404 error to test resource not found error tracking
   */
  @Post('test/not-found')
  @ApiOperation({
    summary: 'Test 404 Not Found error tracking (Admin only)',
    description: 'Generates a 404 Not Found error to test resource not found error tracking.',
  })
  @ApiOkResponse({
    description: 'Test not found error generated successfully (will return 404 error)',
    type: TestErrorResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({ description: 'Forbidden - Only admins can access monitoring data' })
  async testNotFound(
    @Request() req: Request & { user: Omit<PayloadDTO, 'password'> },
  ) {
    throw new HttpException(
      {
        message: 'Test Not Found error - This is a test 404 error for monitoring verification',
        statusCode: 404,
        test: true,
        userId: req.user.sub,
        timestamp: new Date().toISOString(),
      },
      HttpStatus.NOT_FOUND,
    );
  }

  /**
   * Test endpoint for 409 Conflict errors
   * Generates a 409 error to test conflict error tracking
   */
  @Post('test/conflict')
  @ApiOperation({
    summary: 'Test 409 Conflict error tracking (Admin only)',
    description: 'Generates a 409 Conflict error to test conflict error tracking.',
  })
  @ApiOkResponse({
    description: 'Test conflict error generated successfully (will return 409 error)',
    type: TestErrorResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({ description: 'Forbidden - Only admins can access monitoring data' })
  async testConflict(
    @Request() req: Request & { user: Omit<PayloadDTO, 'password'> },
  ) {
    throw new HttpException(
      {
        message: 'Test Conflict error - This is a test 409 error for monitoring verification',
        statusCode: 409,
        test: true,
        userId: req.user.sub,
        timestamp: new Date().toISOString(),
      },
      HttpStatus.CONFLICT,
    );
  }

  /**
   * Test endpoint for 422 Unprocessable Entity errors
   * Generates a 422 error to test validation error tracking
   */
  @Post('test/unprocessable')
  @ApiOperation({
    summary: 'Test 422 Unprocessable Entity error tracking (Admin only)',
    description: 'Generates a 422 Unprocessable Entity error to test validation error tracking.',
  })
  @ApiOkResponse({
    description: 'Test unprocessable error generated successfully (will return 422 error)',
    type: TestErrorResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({ description: 'Forbidden - Only admins can access monitoring data' })
  async testUnprocessable(
    @Request() req: Request & { user: Omit<PayloadDTO, 'password'> },
  ) {
    throw new HttpException(
      {
        message: 'Test Unprocessable Entity error - This is a test 422 error for monitoring verification',
        statusCode: 422,
        test: true,
        userId: req.user.sub,
        timestamp: new Date().toISOString(),
      },
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }

  /**
   * Test endpoint for 502 Bad Gateway errors
   * Generates a 502 error to test upstream server error tracking
   */
  @Post('test/bad-gateway')
  @ApiOperation({
    summary: 'Test 502 Bad Gateway error tracking (Admin only)',
    description: 'Generates a 502 Bad Gateway error to test upstream server error tracking.',
  })
  @ApiOkResponse({
    description: 'Test bad gateway error generated successfully (will return 502 error)',
    type: TestErrorResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({ description: 'Forbidden - Only admins can access monitoring data' })
  async testBadGateway(
    @Request() req: Request & { user: Omit<PayloadDTO, 'password'> },
  ) {
    throw new HttpException(
      {
        message: 'Test Bad Gateway error - This is a test 502 error for monitoring verification',
        statusCode: 502,
        test: true,
        userId: req.user.sub,
        timestamp: new Date().toISOString(),
      },
      HttpStatus.BAD_GATEWAY,
    );
  }

  /**
   * Test endpoint for 503 Service Unavailable errors
   * Generates a 503 error to test service unavailable error tracking
   */
  @Post('test/service-unavailable')
  @ApiOperation({
    summary: 'Test 503 Service Unavailable error tracking (Admin only)',
    description: 'Generates a 503 Service Unavailable error to test service unavailable error tracking.',
  })
  @ApiOkResponse({
    description: 'Test service unavailable error generated successfully (will return 503 error)',
    type: TestErrorResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({ description: 'Forbidden - Only admins can access monitoring data' })
  async testServiceUnavailable(
    @Request() req: Request & { user: Omit<PayloadDTO, 'password'> },
  ) {
    throw new HttpException(
      {
        message: 'Test Service Unavailable error - This is a test 503 error for monitoring verification',
        statusCode: 503,
        test: true,
        userId: req.user.sub,
        timestamp: new Date().toISOString(),
      },
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }

  /**
   * Get live route monitoring data
   * Returns real-time statistics about all routes currently being used
   */
  @Get('routes/live')
  @ApiOperation({
    summary: 'Get live route monitoring data (Admin only)',
    description: 'Returns real-time statistics about all routes currently being used. This endpoint provides live monitoring data for the frontend dashboard, showing which routes are active, their usage counts, response times, and error rates.',
  })
  @ApiOkResponse({
    description: 'Returns live route statistics',
    type: [RouteStatDto],
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({ description: 'Forbidden - Only admins can access monitoring data' })
  async getLiveRoutes() {
    return this.routeTrackingService.getAllRouteStats();
  }

  /**
   * Get route monitoring summary
   * Returns aggregated statistics about route usage
   */
  @Get('routes/summary')
  @ApiOperation({
    summary: 'Get route monitoring summary (Admin only)',
    description: 'Returns aggregated statistics about route usage including most used routes, slowest routes, and routes with errors. Perfect for displaying in a monitoring dashboard.',
  })
  @ApiOkResponse({
    description: 'Returns route monitoring summary',
    type: RouteSummaryDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({ description: 'Forbidden - Only admins can access monitoring data' })
  async getRouteSummary() {
    return this.routeTrackingService.getSummary();
  }

  /**
   * Get statistics for a specific route
   */
  @Get('routes/:endpoint')
  @ApiOperation({
    summary: 'Get statistics for a specific route (Admin only)',
    description: 'Returns detailed statistics for a specific route endpoint. Optionally filter by HTTP method.',
  })
  @ApiQuery({ name: 'method', required: false, description: 'HTTP method to filter by (e.g., GET, POST)' })
  @ApiOkResponse({
    description: 'Returns route statistics',
    type: RouteStatDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({ description: 'Forbidden - Only admins can access monitoring data' })
  async getRouteStat(
    @Param('endpoint') endpoint: string,
    @Query('method') method?: string,
  ) {
    const decodedEndpoint = decodeURIComponent(endpoint);
    return this.routeTrackingService.getRouteStat(decodedEndpoint, method) || {
      message: 'Route not found',
      endpoint: decodedEndpoint,
      method: method || 'any',
    };
  }

  /**
   * Clear route statistics
   * Resets all route tracking data
   */
  @Post('routes/clear')
  @ApiOperation({
    summary: 'Clear route statistics (Admin only)',
    description: 'Clears all route tracking statistics. Useful for resetting monitoring data.',
  })
  @ApiOkResponse({
    description: 'Route statistics cleared successfully',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({ description: 'Forbidden - Only admins can access monitoring data' })
  async clearRouteStats() {
    this.routeTrackingService.clearStats();
    return {
      message: 'Route statistics cleared successfully',
      timestamp: new Date(),
    };
  }
}
