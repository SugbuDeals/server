import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

/**
 * Global Error Handler Service
 * 
 * Catches unhandled exceptions and promise rejections that occur
 * outside of the HTTP request/response cycle. This ensures all
 * application errors are logged, not just HTTP exceptions.
 */
@Injectable()
export class GlobalErrorHandlerService implements OnModuleInit {
  private readonly logger = new Logger(GlobalErrorHandlerService.name);
  private errorHandlerBound = false;

  constructor(private prisma: PrismaService) {}

  onModuleInit() {
    if (!this.errorHandlerBound) {
      this.setupGlobalErrorHandlers();
      this.errorHandlerBound = true;
    }
  }

  /**
   * Setup global error handlers for unhandled exceptions and promise rejections
   */
  private setupGlobalErrorHandlers(): void {
    // Handle uncaught exceptions
    process.on('uncaughtException', (error: Error) => {
      this.logger.error('Uncaught Exception:', error);
      this.logErrorToDatabase({
        level: 'error',
        message: `Uncaught Exception: ${error.message}`,
        stack: error.stack,
        endpoint: 'N/A (uncaught exception)',
        method: 'N/A',
        userId: null,
        statusCode: 500,
        metadata: {
          type: 'uncaughtException',
          name: error.name,
        },
      }).catch((err) => {
        this.logger.error('Failed to log uncaught exception to database', err);
      });
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
      const errorMessage = reason instanceof Error 
        ? reason.message 
        : String(reason);
      const errorStack = reason instanceof Error 
        ? reason.stack 
        : undefined;
      
      this.logger.error('Unhandled Promise Rejection:', reason);
      this.logErrorToDatabase({
        level: 'error',
        message: `Unhandled Promise Rejection: ${errorMessage}`,
        stack: errorStack,
        endpoint: 'N/A (unhandled rejection)',
        method: 'N/A',
        userId: null,
        statusCode: 500,
        metadata: {
          type: 'unhandledRejection',
          reason: typeof reason === 'object' ? JSON.stringify(reason) : String(reason),
        },
      }).catch((err) => {
        this.logger.error('Failed to log unhandled rejection to database', err);
      });
    });

    // Handle warnings
    process.on('warning', (warning: Error) => {
      this.logger.warn('Process Warning:', warning);
      this.logErrorToDatabase({
        level: 'warn',
        message: `Process Warning: ${warning.message}`,
        stack: warning.stack,
        endpoint: 'N/A (process warning)',
        method: 'N/A',
        userId: null,
        statusCode: null,
        metadata: {
          type: 'processWarning',
          name: warning.name,
        },
      }).catch((err) => {
        // Silently fail for warnings
      });
    });

    this.logger.log('Global error handlers initialized');
  }

  /**
   * Log error to database
   */
  private async logErrorToDatabase(data: {
    level: string;
    message: string;
    stack?: string;
    endpoint?: string;
    method?: string;
    userId?: number | null;
    statusCode?: number | null;
    metadata?: any;
  }): Promise<void> {
    try {
      await this.prisma.errorLog.create({
        data: {
          level: data.level,
          message: data.message.substring(0, 1000),
          stack: data.stack?.substring(0, 5000),
          endpoint: data.endpoint?.substring(0, 500),
          method: data.method,
          userId: data.userId || null,
          statusCode: data.statusCode || null,
          metadata: data.metadata || null,
        },
      });
    } catch (error: any) {
      // Check if it's a table doesn't exist error (P2021)
      if (error?.code === 'P2021') {
        this.logger.warn(
          'ErrorLog table does not exist. Please run migration: npx prisma migrate dev --name add_monitoring_tables',
        );
      } else {
        // Silently fail - don't break the application if logging fails
        this.logger.warn('Failed to save error log to database', error);
      }
    }
  }
}
