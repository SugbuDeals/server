import { Module } from '@nestjs/common';
import { ReportService } from './report.service';
import { ReportController } from './report.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AuthModule } from 'src/auth/auth.module';

/**
 * Report Module
 * 
 * Provides comprehensive reporting functionality for users to report inappropriate behavior
 * from consumers (users) or retailers (stores). Includes full report management capabilities
 * for administrators.
 * 
 * **Core Features:**
 * - Create reports against users (consumers) or stores (retailers)
 * - View reports with pagination and filtering
 * - Update report status with automatic audit trail management
 * - Get reports by user or store with access control
 * 
 * **Access Control:**
 * - All authenticated users can create reports
 * - Users cannot report themselves or their own stores
 * - Only admins can view all reports and update status
 * - Users can view reports for their own stores (retailers) or themselves (consumers)
 * - Store owners can view reports about their stores
 * 
 * **Report Statuses:**
 * - PENDING: Awaiting admin review
 * - REVIEWED: Under review by admin
 * - RESOLVED: Action has been taken
 * - DISMISSED: No action needed
 * 
 * **Report Reasons:**
 * - SPAM: Spam content or behavior
 * - HARASSMENT: Harassing behavior
 * - INAPPROPRIATE_CONTENT: Inappropriate content posted
 * - FAKE_REVIEW: Fake or fraudulent review
 * - SCAM: Scam or fraudulent activity
 * - OTHER: Other reasons not covered above
 * 
 * **Review History:**
 * When a report status changes from PENDING to a reviewed status, the system automatically
 * records the review timestamp and admin ID. This review history is preserved even when
 * status changes between reviewed states or back to PENDING, maintaining a complete audit trail.
 * 
 * **Dependencies:**
 * - PrismaModule: Database access
 * - AuthModule: Authentication and authorization
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
