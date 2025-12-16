import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ViewService } from './view.service';
import { ViewController } from './view.controller';

/**
 * View Module
 * 
 * Provides view tracking functionality for stores, products, and promotions.
 * Includes comprehensive analytics capabilities for retailers.
 * 
 * **Core Features:**
 * - Record user views of entities with automatic timestamp updates
 * - Retrieve user view history with filtering and pagination
 * - Get view counts for entities (public endpoint)
 * - Unique views per user per entity
 * 
 * **Analytics Features:**
 * - Retailer analytics with time period filtering (daily, weekly, monthly, custom)
 * - View engagement metrics for stores and products
 * - Per-entity view breakdowns sorted by popularity
 * - Date range filtering for custom analytics periods
 * 
 * **Access Control:**
 * - View recording and history: Authenticated users
 * - View counts: Public (no authentication required)
 * - Retailer analytics: Retailers and admins only
 * 
 * **Exports:**
 * - ViewService: Can be imported by other modules that need view tracking or analytics
 */
@Module({
  imports: [PrismaModule],
  controllers: [ViewController],
  providers: [ViewService],
  exports: [ViewService],
})
export class ViewModule {}
