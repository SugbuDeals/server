import { Module } from '@nestjs/common';
import { StoreService } from './store.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { StoreController } from './store.controller';
import { AuthModule } from 'src/auth/auth.module';
import { NotificationModule } from 'src/notification/notification.module';

@Module({
  imports: [PrismaModule, AuthModule, NotificationModule],
  providers: [StoreService],
  controllers: [StoreController],
  exports: [StoreService],
})
export class StoreModule {}
