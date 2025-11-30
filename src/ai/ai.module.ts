import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { ProductModule } from '../product/product.module';
import { PromotionModule } from '../promotion/promotion.module';
import { StoreModule } from '../store/store.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [ConfigModule, ProductModule, PromotionModule, StoreModule, AuthModule],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}