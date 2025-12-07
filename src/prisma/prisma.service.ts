import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from 'generated/prisma';

/**
 * Prisma Service
 * 
 * Provides database access through Prisma ORM. This service extends PrismaClient
 * and implements OnModuleInit to establish database connection when the module initializes.
 * 
 * The service is a singleton that provides access to all Prisma models and query methods.
 * It handles database connection lifecycle and can be injected into any service or controller
 * that needs database access.
 * 
 * @example
 * ```typescript
 * constructor(private prisma: PrismaService) {}
 * 
 * async getUsers() {
 *   return this.prisma.user.findMany();
 * }
 * ```
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);

  /**
   * Lifecycle hook that runs when the module is initialized.
   * Establishes connection to the PostgreSQL database using Prisma Client.
   * 
   * This method is automatically called by NestJS when the application starts.
   * It connects to the database specified in the DATABASE_URL environment variable.
   * 
   * @throws {Error} If database connection fails, the application startup will fail
   * @returns Promise that resolves when database connection is established
   */
  async onModuleInit() {
    await this.$connect();
    this.logger.log('✅ Database connected');
  }
}
