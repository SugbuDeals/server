import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as dotenv from 'dotenv';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

dotenv.config();

async function bootstrap() {
  
  const app = await NestFactory.create(AppModule);

  // Enable CORS for all origins
  app.enableCors({
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
  });

  // Only generate Swagger docs if not explicitly disabled (helps with memory on low-resource servers)
  if (process.env.DISABLE_SWAGGER !== 'true') {
    try {
      const options = new DocumentBuilder()
        .setTitle('SugbuDeals API')
        .setDescription('REST API for SugbuDeals: authentication, users, stores, products, categories, promotions, and AI endpoints.')
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
        .addTag('AI', 'AI chat, generation, and recommendations')
        .build();

      const document = SwaggerModule.createDocument(app, options);
      SwaggerModule.setup('api', app, document);
    } catch (error) {
      console.warn('Failed to generate Swagger documentation:', error.message);
      // Continue without Swagger if generation fails (e.g., due to memory constraints)
    }
  }

  app.useGlobalPipes(new ValidationPipe());
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
