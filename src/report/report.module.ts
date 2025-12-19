import { Module } from '@nestjs/common';
import { ReportService } from './report.service';
import { ReportController } from './report.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AuthModule } from 'src/auth/auth.module';

/**
 * Report Module
 * 
 * Provides reporting functionality for users to report stores/retailers and consumers.
 * Includes comprehensive report management for admins.
 * 
 * **Core Features:**
 * - Create reports against users (consumers) or stores (retailers)
 * - View reports (admin only, or users viewing their own reports)
 * - Update report status (admin only)
 * - Get reports by user or store
 * 
 * **Access Control:**
 * - All authenticated users can create reports
 * - Users cannot report themselves or their own stores
 * - Only admins can view all reports and update status
 * - Users can view reports for their own stores (retailers) or themselves (consumers)
 * 
 * **Exports:**
 * - ReportService: Can be imported by other modules that need report functionality
 */
@Module({
  imports: [PrismaModule, AuthModule],
  providers: [ReportService],
  controllers: [ReportController],
  exports: [ReportService],
})
export class ReportModule {}
