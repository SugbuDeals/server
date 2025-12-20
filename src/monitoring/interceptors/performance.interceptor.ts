import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';
import { PrismaService } from 'src/prisma/prisma.service';
import { RouteTrackingService } from '../services/route-tracking.service';

/**
 * Performance Interceptor
 * 
 * Tracks request/response times for all API endpoints.
 * Logs performance metrics to the database for monitoring.
 * Also tracks route usage for live monitoring.
 */
@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  private readonly logger = new Logger(PerformanceInterceptor.name);
  private loggedTableWarning = false;

  constructor(
    private prisma: PrismaService,
    private routeTrackingService: RouteTrackingService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const responseTime = Date.now() - startTime;
          const statusCode = context.switchToHttp().getResponse().statusCode || 200;
          const userId = (request as any).user?.sub || (request as any).user?.id;

          // Track route usage for live monitoring
          try {
            this.routeTrackingService.trackRoute(
              request.url,
              request.method,
              responseTime,
              statusCode,
            );
          } catch (err) {
            // Silently fail - don't break request handling
          }

          // Log to database (non-blocking, async)
          this.logPerformanceMetric({
            endpoint: request.url,
            method: request.method,
            responseTime,
            statusCode,
            userId: userId || null,
          }).catch((err) => {
            this.logger.warn('Failed to log performance metric', err);
          });
        },
        error: () => {
          // Errors are handled by the exception filter
          // We still log performance even for errors
          const responseTime = Date.now() - startTime;
          const statusCode = context.switchToHttp().getResponse().statusCode || 500;
          const userId = (request as any).user?.sub || (request as any).user?.id;

          // Track route usage for live monitoring (including errors)
          try {
            this.routeTrackingService.trackRoute(
              request.url,
              request.method,
              responseTime,
              statusCode,
            );
          } catch (err) {
            // Silently fail - don't break error handling
          }

          this.logPerformanceMetric({
            endpoint: request.url,
            method: request.method,
            responseTime,
            statusCode,
            userId: userId || null,
          }).catch(() => {
            // Silently fail
          });
        },
      }),
    );
  }

  private async logPerformanceMetric(data: {
    endpoint: string;
    method: string;
    responseTime: number;
    statusCode: number;
    userId?: number | null;
  }) {
    try {
      // Only log if response time is significant or if it's an error
      // This reduces database writes for fast endpoints
      if (data.responseTime > 100 || data.statusCode >= 400) {
        await this.prisma.performanceMetric.create({
          data: {
            endpoint: data.endpoint.substring(0, 500),
            method: data.method,
            responseTime: data.responseTime,
            statusCode: data.statusCode,
            userId: data.userId || null,
          },
        });
      }
    } catch (error: any) {
      // Check if it's a table doesn't exist error (P2021)
      if (error?.code === 'P2021') {
        // Only log once to avoid spam
        if (!this.loggedTableWarning) {
          this.logger.warn(
            'PerformanceMetric table does not exist. Please run migration: npx prisma migrate dev --name add_monitoring_tables',
          );
          this.loggedTableWarning = true;
        }
      } else {
        // Silently fail for other errors - don't break the application if logging fails
        this.logger.warn('Failed to save performance metric to database', error);
      }
    }
  }
}
