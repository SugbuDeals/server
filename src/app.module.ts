import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PrismaModule } from './prisma/prisma.module';
import { StoreModule } from './store/store.module';
import { ProductModule } from './product/product.module';
import { AiModule } from './ai/ai.module';
import { PromotionModule } from './promotion/promotion.module';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    PrismaModule,
    StoreModule,
    ProductModule,
    PromotionModule,
    AiModule,
  ],
})
export class AppModule {}
