import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { MonitoringQueryDto, TimeRange } from './dto/monitoring-query.dto';
import { DashboardStatsDto, ErrorStatsDto, PerformanceStatsDto } from './dto/dashboard-stats.dto';

/**
 * Monitoring Service
 * 
 * Provides methods to query error logs and performance metrics
 * for the admin monitoring dashboard.
 */
@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Get date range based on time range enum
   */
  private getDateRange(timeRange?: TimeRange): { start: Date; end: Date } {
    const end = new Date();
    let start = new Date();

    switch (timeRange) {
      case TimeRange.HOUR:
        start.setHours(start.getHours() - 1);
        break;
      case TimeRange.DAY:
        start.setDate(start.getDate() - 1);
        break;
      case TimeRange.WEEK:
        start.setDate(start.getDate() - 7);
        break;
      case TimeRange.MONTH:
        start.setMonth(start.getMonth() - 1);
        break;
      default:
        start.setDate(start.getDate() - 1); // Default to last 24 hours
    }

    return { start, end };
  }

  /**
   * Get error logs with filtering and pagination
   */
  async getErrorLogs(query: MonitoringQueryDto) {
    const { page = 1, limit = 20, timeRange, startDate, endDate, endpoint, method, level } = query;
    const skip = (page - 1) * limit;

    let dateFilter: { gte?: Date; lte?: Date } = {};

    if (startDate && endDate) {
      dateFilter = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    } else if (timeRange) {
      const range = this.getDateRange(timeRange);
      dateFilter = {
        gte: range.start,
        lte: range.end,
      };
    }

    const where: any = {
      ...(dateFilter.gte && { createdAt: dateFilter }),
      ...(endpoint && { endpoint: { contains: endpoint } }),
      ...(method && { method }),
      ...(level && { level }), // Filter by error level if provided
    };

    const [logs, total] = await Promise.all([
      this.prisma.errorLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      }),
      this.prisma.errorLog.count({ where }),
    ]);

    return {
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get performance metrics with filtering and pagination
   */
  async getPerformanceMetrics(query: MonitoringQueryDto) {
    const { page = 1, limit = 20, timeRange, startDate, endDate, endpoint, method } = query;
    const skip = (page - 1) * limit;

    let dateFilter: { gte?: Date; lte?: Date } = {};

    if (startDate && endDate) {
      dateFilter = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    } else if (timeRange) {
      const range = this.getDateRange(timeRange);
      dateFilter = {
        gte: range.start,
        lte: range.end,
      };
    }

    const where: any = {
      ...(dateFilter.gte && { createdAt: dateFilter }),
      ...(endpoint && { endpoint: { contains: endpoint } }),
      ...(method && { method }),
    };

    const [metrics, total] = await Promise.all([
      this.prisma.performanceMetric.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      }),
      this.prisma.performanceMetric.count({ where }),
    ]);

    return {
      data: metrics,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get error statistics
   */
  async getErrorStats(timeRange?: TimeRange, startDate?: string, endDate?: string): Promise<ErrorStatsDto> {
    let dateFilter: { gte?: Date; lte?: Date } = {};

    if (startDate && endDate) {
      dateFilter = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    } else if (timeRange) {
      const range = this.getDateRange(timeRange);
      dateFilter = {
        gte: range.start,
        lte: range.end,
      };
    } else {
      // Default to last 24 hours
      const range = this.getDateRange(TimeRange.DAY);
      dateFilter = {
        gte: range.start,
        lte: range.end,
      };
    }

    const where = { createdAt: dateFilter };

    // Get last 24 hours for comparison
    const last24hStart = new Date();
    last24hStart.setDate(last24hStart.getDate() - 1);

    const [totalErrors, totalWarnings, errorsLast24h, warningsLast24h, allErrors] = await Promise.all([
      this.prisma.errorLog.count({ where: { ...where, level: 'error' } }),
      this.prisma.errorLog.count({ where: { ...where, level: 'warn' } }),
      this.prisma.errorLog.count({
        where: {
          level: 'error',
          createdAt: { gte: last24hStart },
        },
      }),
      this.prisma.errorLog.count({
        where: {
          level: 'warn',
          createdAt: { gte: last24hStart },
        },
      }),
      this.prisma.errorLog.findMany({
        where,
        select: { endpoint: true, statusCode: true },
      }),
    ]);

    // Get top error endpoints
    const endpointCounts: Record<string, number> = {};
    allErrors.forEach((error: { endpoint: string | null; statusCode: number | null }) => {
      if (error.endpoint) {
        endpointCounts[error.endpoint] = (endpointCounts[error.endpoint] || 0) + 1;
      }
    });
    const topErrorEndpoints = Object.entries(endpointCounts)
      .sort(([, a]: [string, number], [, b]: [string, number]) => b - a)
      .slice(0, 10)
      .map(([endpoint]: [string, number]) => endpoint);

    // Get errors by status code
    const errorsByStatusCode: Record<string, number> = {};
    allErrors.forEach((error: { endpoint: string | null; statusCode: number | null }) => {
      if (error.statusCode) {
        const code = error.statusCode.toString();
        errorsByStatusCode[code] = (errorsByStatusCode[code] || 0) + 1;
      }
    });

    return {
      totalErrors,
      totalWarnings,
      errorsLast24h,
      warningsLast24h,
      topErrorEndpoints,
      errorsByStatusCode,
    };
  }

  /**
   * Get performance statistics
   */
  async getPerformanceStats(
    timeRange?: TimeRange,
    startDate?: string,
    endDate?: string,
  ): Promise<PerformanceStatsDto> {
    let dateFilter: { gte?: Date; lte?: Date } = {};

    if (startDate && endDate) {
      dateFilter = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    } else if (timeRange) {
      const range = this.getDateRange(timeRange);
      dateFilter = {
        gte: range.start,
        lte: range.end,
      };
    } else {
      // Default to last 24 hours
      const range = this.getDateRange(TimeRange.DAY);
      dateFilter = {
        gte: range.start,
        lte: range.end,
      };
    }

    const where = { createdAt: dateFilter };

    const metrics = await this.prisma.performanceMetric.findMany({
      where,
      select: {
        endpoint: true,
        responseTime: true,
        statusCode: true,
      },
    });

    if (metrics.length === 0) {
      return {
        avgResponseTime: 0,
        maxResponseTime: 0,
        minResponseTime: 0,
        totalRequests: 0,
        slowestEndpoints: [],
        requestsByStatusCode: {},
      };
    }

    const responseTimes = metrics.map((m: { responseTime: number }) => m.responseTime);
    const avgResponseTime = Math.round(
      responseTimes.reduce((a: number, b: number) => a + b, 0) / responseTimes.length,
    );
    const maxResponseTime = Math.max(...responseTimes);
    const minResponseTime = Math.min(...responseTimes);

    // Get slowest endpoints
    const endpointTimes: Record<string, number[]> = {};
    metrics.forEach((metric: { endpoint: string; responseTime: number }) => {
      if (metric.endpoint) {
        if (!endpointTimes[metric.endpoint]) {
          endpointTimes[metric.endpoint] = [];
        }
        endpointTimes[metric.endpoint].push(metric.responseTime);
      }
    });

    const slowestEndpoints = Object.entries(endpointTimes)
      .map(([endpoint, times]: [string, number[]]) => ({
        endpoint,
        avgTime: times.reduce((a: number, b: number) => a + b, 0) / times.length,
      }))
      .sort((a: { endpoint: string; avgTime: number }, b: { endpoint: string; avgTime: number }) => b.avgTime - a.avgTime)
      .slice(0, 10)
      .map((e: { endpoint: string; avgTime: number }) => e.endpoint);

    // Get requests by status code
    const requestsByStatusCode: Record<string, number> = {};
    metrics.forEach((metric: { statusCode: number }) => {
      const code = metric.statusCode.toString();
      requestsByStatusCode[code] = (requestsByStatusCode[code] || 0) + 1;
    });

    return {
      avgResponseTime,
      maxResponseTime,
      minResponseTime,
      totalRequests: metrics.length,
      slowestEndpoints,
      requestsByStatusCode,
    };
  }

  /**
   * Get dashboard statistics (combined errors and performance)
   */
  async getDashboardStats(
    timeRange?: TimeRange,
    startDate?: string,
    endDate?: string,
  ): Promise<DashboardStatsDto> {
    const [errors, performance] = await Promise.all([
      this.getErrorStats(timeRange, startDate, endDate),
      this.getPerformanceStats(timeRange, startDate, endDate),
    ]);

    return {
      errors,
      performance,
      generatedAt: new Date(),
    };
  }
}
