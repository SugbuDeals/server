import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { PrismaService } from 'src/prisma/prisma.service';

/**
 * Global Exception Filter
 * 
 * Catches all exceptions and logs them to the database for monitoring.
 * This provides centralized error tracking for the admin dashboard.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private prisma: PrismaService) {}

  async catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Determine status code
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorMessage = 'Unknown error';
    let stack: string | undefined;
    let errorMetadata: any = {};

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const response = exception.getResponse();
      errorMessage = typeof response === 'string' ? response : (response as any)?.message || 'HTTP Exception';
      stack = exception.stack;
    } else if (exception instanceof Error) {
      // Handle various Error types
      errorMessage = exception.message;
      stack = exception.stack;
      
      // Check for Prisma errors
      if ((exception as any).code) {
        errorMetadata.prismaCode = (exception as any).code;
        errorMetadata.prismaMeta = (exception as any).meta;
        
        // Map Prisma error codes to HTTP status codes
        const prismaErrorMap: Record<string, number> = {
          'P2002': HttpStatus.CONFLICT, // Unique constraint violation
          'P2025': HttpStatus.NOT_FOUND, // Record not found
          'P2003': HttpStatus.BAD_REQUEST, // Foreign key constraint violation
          'P2014': HttpStatus.BAD_REQUEST, // Required relation violation
        };
        
        status = prismaErrorMap[(exception as any).code] || HttpStatus.INTERNAL_SERVER_ERROR;
      }
      
      // Check for validation errors
      if (exception.name === 'ValidationError' || exception.message.includes('validation')) {
        status = HttpStatus.BAD_REQUEST;
        errorMetadata.validationError = true;
      }
      
      // Check for type errors (often indicate application bugs)
      if (exception.name === 'TypeError') {
        status = HttpStatus.INTERNAL_SERVER_ERROR;
        errorMetadata.typeError = true;
      }
      
      // Check for reference errors
      if (exception.name === 'ReferenceError') {
        status = HttpStatus.INTERNAL_SERVER_ERROR;
        errorMetadata.referenceError = true;
      }
    } else {
      // Handle non-Error exceptions (strings, objects, etc.)
      errorMessage = typeof exception === 'string' 
        ? exception 
        : JSON.stringify(exception);
      errorMetadata.rawException = true;
    }

    // Extract user ID from request if authenticated
    const userId = (request as any).user?.sub || (request as any).user?.id;

    // Log to database (non-blocking)
    this.logErrorToDatabase({
      level: status >= 500 ? 'error' : 'warn',
      message: errorMessage,
      stack: stack?.substring(0, 5000), // Limit stack trace length
      endpoint: request.url,
      method: request.method,
      userId: userId || null,
      statusCode: status,
      metadata: {
        ...errorMetadata,
        errorName: exception instanceof Error ? exception.name : 'Unknown',
        body: this.sanitizeRequestBody(request.body),
        query: request.query,
        params: request.params,
        headers: this.sanitizeHeaders(request.headers),
      },
    }).catch((err) => {
      this.logger.error('Failed to log error to database', err);
    });

    // Log to console
    this.logger.error(
      `Error ${status}: ${errorMessage} - ${request.method} ${request.url}`,
      stack,
    );

    // Send response
    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: errorMessage,
    });
  }

  private async logErrorToDatabase(data: {
    level: string;
    message: string;
    stack?: string;
    endpoint?: string;
    method?: string;
    userId?: number | null;
    statusCode?: number;
    metadata?: any;
  }) {
    try {
      // Check if ErrorLog table exists by attempting to query it
      // This handles the case where migrations haven't been run yet
      await this.prisma.errorLog.create({
        data: {
          level: data.level,
          message: data.message.substring(0, 1000), // Limit message length
          stack: data.stack,
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
          `ErrorLog table does not exist. Please run migration: npx prisma migrate dev --name add_monitoring_tables. Error: ${data.message} - ${data.method} ${data.endpoint}`,
        );
      } else {
        // Silently fail for other errors - don't break the application if logging fails
        this.logger.warn('Failed to save error log to database', error);
      }
    }
  }

  private sanitizeRequestBody(body: any): any {
    if (!body) return null;
    
    // Remove sensitive fields
    const sanitized = { ...body };
    const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'authorization'];
    
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }

  private sanitizeHeaders(headers: any): any {
    if (!headers) return null;
    
    const sanitized: any = {};
    const allowedHeaders = ['content-type', 'accept', 'user-agent', 'origin', 'referer'];
    
    for (const [key, value] of Object.entries(headers)) {
      const lowerKey = key.toLowerCase();
      if (allowedHeaders.includes(lowerKey)) {
        sanitized[lowerKey] = value;
      } else if (lowerKey === 'authorization') {
        sanitized[lowerKey] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }
}
