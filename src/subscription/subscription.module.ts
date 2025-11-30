import { Module } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { SubscriptionController } from './subscription.controller';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  providers: [SubscriptionService],
  controllers: [SubscriptionController],
  exports: [SubscriptionService],
})
export class SubscriptionModule {}

