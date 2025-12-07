import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { FileController } from './file.controller';
import { ConfigModule } from '@nestjs/config';

/**
 * Upload path constant
 * 
 * Defines the directory where uploaded files are stored.
 * Defaults to 'uploads' directory in the project root.
 */
export const UPLOAD_PATH = join(process.cwd(), 'uploads');

// Ensure directory exists
if (!existsSync(UPLOAD_PATH)) {
  mkdirSync(UPLOAD_PATH, { recursive: true });
}

/**
 * File Module
 * 
 * Provides file upload and management functionality.
 * 
 * Configuration:
 * - Storage: Disk storage in 'uploads' directory
 * - File naming: Unique suffixes to prevent conflicts
 * - Maximum file size: 100MB
 * - File serving: Public access via GET endpoint
 * 
 * The module automatically creates the uploads directory if it doesn't exist.
 */
@Module({
  imports: [
    ConfigModule,
    MulterModule.register({
      storage: diskStorage({
        destination: UPLOAD_PATH,
        filename: (req, file, callback) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          const filename = `${file.fieldname}-${uniqueSuffix}${ext}`;
          callback(null, filename);
        },
      }),
      limits: {
        fileSize: 100 * 1024 * 1024, // 100MB Limit
      },
    }),
  ],
  controllers: [FileController],
})
export class FileModule {}
