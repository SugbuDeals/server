import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Prisma Module
 * 
 * Provides PrismaService as a global database access provider.
 * This module exports PrismaService so it can be imported and used by other modules
 * throughout the application.
 * 
 * The PrismaService is configured as a provider and exported, making it available
 * for dependency injection in any module that imports PrismaModule.
 */
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
