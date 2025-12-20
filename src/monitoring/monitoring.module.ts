import { Module, Global } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from 'src/prisma/prisma.module';
import { MonitoringService } from './monitoring.service';
import { MonitoringController } from './monitoring.controller';
import { AllExceptionsFilter } from './filters/http-exception.filter';
import { PerformanceInterceptor } from './interceptors/performance.interceptor';
import { RouteTrackingService } from './services/route-tracking.service';
import { GlobalErrorHandlerService } from './services/global-error-handler.service';

/**
 * Monitoring Module
 * 
 * Provides system-wide monitoring capabilities:
 * - Global exception filter for error tracking
 * - Performance interceptor for response time tracking
 * - Global error handlers for unhandled exceptions and promise rejections
 * - Route tracking service for live route monitoring
 * - Admin-only endpoints for viewing monitoring data
 * 
 * This module is marked as @Global() so the filter and interceptor
 * are available application-wide.
 */
@Global()
@Module({
  imports: [PrismaModule],
  controllers: [MonitoringController],
  providers: [
    MonitoringService,
    RouteTrackingService,
    GlobalErrorHandlerService,
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: PerformanceInterceptor,
    },
  ],
  exports: [MonitoringService, RouteTrackingService],
})
export class MonitoringModule {}
