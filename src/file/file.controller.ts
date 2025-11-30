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
} from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { unlink, readdir, stat } from 'fs/promises';
import { existsSync } from 'fs';
import { UPLOAD_PATH } from './file.module'; // Import the shared constant
import { join } from 'path';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@ApiTags('Files')
@Controller('files')
export class FileController {
  private readonly logger = new Logger(FileController.name);
  private readonly uploadPath = UPLOAD_PATH; // Use shared constant

  constructor(private readonly configService: ConfigService) {}

  @Get(':filename')
  @ApiOperation({ summary: 'Get/serve a file' })
  @ApiParam({
    name: 'filename',
    description: 'Name of the file to serve',
    example: 'image-1234567890.jpg',
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

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'File uploaded successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'No file uploaded or invalid file',
  })
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

  @Delete(':filename')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a file' })
  @ApiParam({
    name: 'filename',
    description: 'Name of the file to delete',
    example: 'image-1234567890.jpg',
  })
  @ApiResponse({
    status: 200,
    description: 'File deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'File not found',
  })
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

  @Delete('clear')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Clear all uploaded files' })
  @ApiResponse({
    status: 200,
    description: 'All files cleared successfully',
  })
  @ApiResponse({
    status: 500,
    description: 'Error clearing files',
  })
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
