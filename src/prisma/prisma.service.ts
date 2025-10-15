import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from 'generated/prisma';
import stores from './data/store.data';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    await this.$connect();
    this.logger.log('✅ Database connected');

    // Run seed on startup (only in development)
    if (process.env.NODE_ENV === 'development') {
      await this.seed();
    }
  }

  async seed() {
    this.logger.log('🌱 Starting database seeding...');

    try {
      // store seeding
      for (const { id, name, description } of stores) {
        await this.store.upsert({
          where: { id },
          update: {},
          create: { name, description },
        });
      }
      
      this.logger.log('✨ Seeding completed successfully!');
    } catch (error) {
      this.logger.error('❌ Error during seeding:', error);
      throw error;
    }
  }
}
