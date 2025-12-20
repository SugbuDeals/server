import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as dotenv from 'dotenv';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

dotenv.config();

/**
 * Bootstrap function
 * 
 * Initializes and starts the NestJS application. This function:
 * - Creates the NestJS application instance
 * - Configures CORS for cross-origin requests
 * - Sets up Swagger/OpenAPI documentation (if enabled)
 * - Configures global validation pipes
 * - Starts the HTTP server on the configured port
 * 
 * @returns Promise that resolves when the server is listening
 * @throws {Error} If application startup fails (e.g., port already in use, database connection failure)
 * 
 * @example
 * ```typescript
 * bootstrap().catch((error) => {
 *   console.error('Application failed to start:', error);
 *   process.exit(1);
 * });
 * ```
 */
async function bootstrap() {
  
  const app = await NestFactory.create(AppModule);

  // Enable CORS for all origins
  app.enableCors({
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
  });

  /**
   * Swagger/OpenAPI Documentation Configuration
   * 
   * Sets up interactive API documentation at /api endpoint. The documentation
   * can be disabled by setting DISABLE_SWAGGER=true in environment variables,
   * which is useful for low-memory server environments.
   * 
   * Features:
   * - JWT Bearer token authentication support
   * - Organized API tags for different resource groups
   * - Interactive API testing interface
   * 
   * If Swagger generation fails (e.g., due to memory constraints), the application
   * will continue to run without documentation.
   */
  if (process.env.DISABLE_SWAGGER !== 'true') {
    try {
      const options = new DocumentBuilder()
        .setTitle('SugbuDeals API')
        .setDescription('REST API for SugbuDeals: authentication, users, stores, products, categories, promotions, bookmarks, subscriptions, notifications, files, and AI endpoints.')
        .setVersion('1.0.0')
        .addBearerAuth(
          {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'Include JWT token as: Bearer <token>'
          },
          'bearer'
        )
        .addTag('Auth', 'Authentication endpoints')
        .addTag('Users', 'User management endpoints')
        .addTag('Stores', 'Store management endpoints')
        .addTag('Products', 'Product management endpoints')
        .addTag('Categories', 'Category management endpoints')
        .addTag('Promotions', 'Promotion management endpoints')
        .addTag('Bookmarks', 'Bookmark stores and products')
        .addTag('Subscriptions', 'Subscription plan and user subscription management')
        .addTag('Notifications', 'User notification management')
        .addTag('AI', 'AI chat, generation, and recommendations')
        .addTag('Files', 'File upload, serving, and management')
        .addTag('Monitoring', 'System performance and error monitoring (Admin only)')
        .build();

      const document = SwaggerModule.createDocument(app, options);
      SwaggerModule.setup('api', app, document);
    } catch (error) {
      console.warn('Failed to generate Swagger documentation:', error.message);
      // Continue without Swagger if generation fails (e.g., due to memory constraints)
    }
  }

  // Global validation pipe for automatic DTO validation
  app.useGlobalPipes(new ValidationPipe());
  
  // Start the HTTP server
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}

bootstrap();
