import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ViewService } from './view.service';
import { ViewController } from './view.controller';

/**
 * View Module
 * 
 * Provides view tracking functionality for stores, products, and promotions.
 * 
 * Features:
 * - Record user views of entities with automatic timestamp updates
 * - Retrieve user view history with filtering and pagination
 * - Get view counts for entities
 * - Unique views per user per entity
 * 
 * Exports:
 * - ViewService: Can be imported by other modules that need view tracking
 */
@Module({
  imports: [PrismaModule],
  controllers: [ViewController],
  providers: [ViewService],
  exports: [ViewService],
})
export class ViewModule {}
