import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { StoreModule } from './store/store.module';
import { ProductModule } from './product/product.module';

@Module({
  imports: [StoreModule, ProductModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
