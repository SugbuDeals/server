import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PrismaModule } from './prisma/prisma.module';
import { StoreModule } from './store/store.module';
import { ProductModule } from './product/product.module';
import { AiModule } from './ai/ai.module';
import { PromotionModule } from './promotion/promotion.module';
import { CategoryModule } from './category/category.module';
import { BookmarkModule } from './bookmark/bookmark.module';
import { FileModule } from './file/file.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { NotificationModule } from './notification/notification.module';
import { ViewModule } from './view/view.module';
import { ReviewModule } from './review/review.module';
import { ReportModule } from './report/report.module';
import { MonitoringModule } from './monitoring/monitoring.module';

/**
 * Application Root Module
 * 
 * The root module of the NestJS application that imports and configures all feature modules.
 * This module serves as the entry point for dependency injection and module organization.
 * 
 * Features:
 * - ScheduleModule: Enables cron jobs and scheduled tasks
 * - All feature modules: Auth, Users, Stores, Products, Categories, Promotions,
 *   Bookmarks, Views, AI, Files, Subscriptions, Notifications, Reviews, Reports, and Monitoring
 * 
 * The PrismaModule is imported to provide database access throughout the application.
 */
@Module({
  imports: [
    ScheduleModule.forRoot(),
    AuthModule,
    UsersModule,
    PrismaModule,
    StoreModule,
    ProductModule,
    PromotionModule,
    CategoryModule,
    BookmarkModule,
    ViewModule,
    AiModule,
    FileModule,
    SubscriptionModule,
    NotificationModule,
    ReviewModule,
    ReportModule,
    MonitoringModule,
  ],
})
export class AppModule {}
