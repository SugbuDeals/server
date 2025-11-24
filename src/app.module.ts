import { Module } from '@nestjs/common';
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

@Module({
  imports: [
    AuthModule,
    UsersModule,
    PrismaModule,
    StoreModule,
    ProductModule,
    PromotionModule,
    CategoryModule,
    BookmarkModule,
    AiModule,
    FileModule,
    SubscriptionModule,
    NotificationModule,
  ],
})
export class AppModule {}
