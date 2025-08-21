import { Module } from '@nestjs/common';
import { StoreService } from './store.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [StoreService],
})
export class StoreModule {}
