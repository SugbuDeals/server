import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Logger,
  NotFoundException,
  Param,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiParam,
  ApiResponse,
  ApiTags,
  ApiBearerAuth,
  ApiOkResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { unlink, readdir, stat } from 'fs/promises';
import { existsSync } from 'fs';
import { UPLOAD_PATH } from './file.module'; // Import the shared constant
import { join } from 'path';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { RolesGuard } from 'src/auth/roles.guard';
import { UserRole } from 'generated/prisma';

/**
 * File Controller
 * 
 * Handles HTTP requests for file management operations.
 * Provides endpoints for uploading, serving, and deleting files.
 * 
 * Features:
 * - File upload with automatic unique naming
 * - File serving (public access)
 * - File deletion (authenticated users)
 * - Bulk file deletion (admin only)
 * 
 * File Storage:
 * - Files are stored in the 'uploads' directory
 * - Maximum file size: 100MB
 * - Files are automatically renamed with unique suffixes to prevent conflicts
 */
@ApiTags('Files')
@Controller('files')
export class FileController {
  private readonly logger = new Logger(FileController.name);
  private readonly uploadPath = UPLOAD_PATH; // Use shared constant

  constructor(private readonly configService: ConfigService) {}

  /**
   * Serves a file from the uploads directory.
   * 
   * This endpoint is publicly accessible (no authentication required).
   * Files are served directly from the filesystem.
   * 
   * @param filename - Name of the file to serve
   * @param res - Express response object
   * @returns File content or 404 if file not found
   */
  @Get(':filename')
  @ApiOperation({ 
    summary: 'Get/serve a file',
    description: 'Serves a file from the uploads directory. This endpoint is publicly accessible (no authentication required).'
  })
  @ApiParam({
    name: 'filename',
    description: 'Name of the file to serve',
    example: 'image-1234567890.jpg',
  })
  @ApiOkResponse({ 
    description: 'File served successfully',
    content: {
      'application/octet-stream': {
        schema: {
          type: 'string',
          format: 'binary'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 404, 
    description: 'File not found',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'File not found' }
      }
    }
  })
  async getFile(@Param('filename') filename: string, @Res() res: Response) {
    const filePath = join(this.uploadPath, filename);

    if (!existsSync(filePath)) {
      this.logger.error(`File not found: ${filePath}`);
      return res.status(404).json({ message: 'File not found' });
    }

    this.logger.log(`Serving file: ${filePath}`);
    return res.sendFile(filePath);
  }

  /**
   * Uploads a file to the server.
   * 
   * Files are automatically renamed with a unique suffix to prevent conflicts.
   * Maximum file size is 100MB. Returns the file URL for accessing the uploaded file.
   * 
   * @param file - Uploaded file from multipart/form-data request
   * @returns File upload information including URL
   * @throws {BadRequestException} If no file is uploaded
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ 
    summary: 'Upload a file',
    description: 'Uploads a file to the server. Files are automatically renamed with unique suffixes. Maximum file size: 100MB. Returns file URL for accessing the uploaded file.'
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'File to upload (max 100MB)'
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'File uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        fileName: { type: 'string', example: 'file-1234567890-123456789.jpg' },
        originalName: { type: 'string', example: 'image.jpg' },
        fileUrl: { type: 'string', example: 'http://localhost:3000/files/file-1234567890-123456789.jpg' },
        size: { type: 'number', example: 1024000 },
        mimeType: { type: 'string', example: 'image/jpeg' }
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'No file uploaded or invalid file',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'No file uploaded' }
      }
    }
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  uploadFiles(@UploadedFile() file: Express.Multer.File) {
    try {
      if (!file) {
        throw new BadRequestException('No file uploaded');
      }

      this.logger.log(`File uploaded: ${file.filename}`);

      const baseUrl =
        this.configService.get('BASE_URL') || 'http://localhost:3000';
      const fileUrl = `${baseUrl}/files/${file.filename}`;

      return {
        fileName: file.filename,
        originalName: file.originalname,
        fileUrl: fileUrl,
        size: file.size,
        mimeType: file.mimetype,
      };
    } catch (error) {
      this.logger.error(error || 'No file found');
      throw error;
    }
  }

  /**
   * Deletes a file from the server.
   * 
   * This operation is permanent and cannot be undone.
   * 
   * @param filename - Name of the file to delete
   * @returns Deletion confirmation
   * @throws {NotFoundException} If file not found
   * @throws {BadRequestException} If deletion fails
   */
  @Delete(':filename')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Delete a file',
    description: 'Permanently deletes a file from the server. This operation cannot be undone.'
  })
  @ApiParam({
    name: 'filename',
    description: 'Name of the file to delete',
    example: 'image-1234567890.jpg',
  })
  @ApiResponse({
    status: 200,
    description: 'File deleted successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'File deleted successfully' },
        fileName: { type: 'string', example: 'image-1234567890.jpg' }
      }
    }
  })
  @ApiResponse({
    status: 404,
    description: 'File not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'File not found' }
      }
    }
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  async deleteFile(@Param('filename') filename: string) {
    try {
      const filePath = join(this.uploadPath, filename);

      if (!existsSync(filePath)) {
        throw new NotFoundException('File not found');
      }

      await unlink(filePath);
      this.logger.log(`File deleted: ${filename}`);

      return {
        message: 'File deleted successfully',
        fileName: filename,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Error deleting file: ${error.message}`);
      throw new BadRequestException('Unable to delete file');
    }
  }

  /**
   * Clears all uploaded files (Admin only).
   * 
   * Deletes all files in the uploads directory. This operation is permanent
   * and cannot be undone. Only files are deleted (directories are skipped).
   * 
   * @returns Deletion summary with count of deleted files
   * @throws {BadRequestException} If clearing fails
   */
  @Delete('clear')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Clear all uploaded files (Admin only)',
    description: 'Permanently deletes all files in the uploads directory. Restricted to admins only. This operation cannot be undone. Only files are deleted (directories are skipped).'
  })
  @ApiResponse({
    status: 200,
    description: 'All files cleared successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'All files cleared successfully' },
        deletedCount: { type: 'number', example: 10 },
        totalFiles: { type: 'number', example: 10 },
        errors: { 
          type: 'array', 
          items: { type: 'string' },
          description: 'List of errors encountered during deletion (if any)'
        }
      }
    }
  })
  @ApiResponse({
    status: 500,
    description: 'Error clearing files',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 500 },
        message: { type: 'string', example: 'Unable to clear files' }
      }
    }
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Only admins can clear all files',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 403 }
      }
    }
  })
  @Roles(UserRole.ADMIN)
  async clearAllFiles() {
    try {
      if (!existsSync(this.uploadPath)) {
        this.logger.warn(`Upload directory does not exist: ${this.uploadPath}`);
        return {
          message: 'No files to clear',
          deletedCount: 0,
        };
      }

      const files = await readdir(this.uploadPath);
      let deletedCount = 0;
      const errors: string[] = [];

      // Delete all files in the uploads directory
      for (const file of files) {
        try {
          const filePath = join(this.uploadPath, file);
          const fileStat = await stat(filePath);
          
          // Only delete files, not directories
          if (fileStat.isFile()) {
            await unlink(filePath);
            deletedCount++;
            this.logger.log(`Deleted file: ${file}`);
          } else {
            this.logger.warn(`Skipping directory: ${file}`);
          }
        } catch (error) {
          const errorMessage = `Failed to delete ${file}: ${error.message}`;
          this.logger.error(errorMessage);
          errors.push(errorMessage);
        }
      }

      this.logger.log(`Cleared ${deletedCount} file(s) from uploads directory`);

      return {
        message: 'All files cleared successfully',
        deletedCount,
        totalFiles: files.length,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      this.logger.error(`Error clearing files: ${error.message}`);
      throw new BadRequestException('Unable to clear files');
    }
  }
}
