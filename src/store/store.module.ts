import { Module } from '@nestjs/common';
import { StoreService } from './store.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { StoreController } from './store.controller';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  providers: [StoreService],
  controllers: [StoreController],
  exports: [StoreService],
})
export class StoreModule {}
