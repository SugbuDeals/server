import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { createMockPrisma, createMockUserWithoutPassword } from './utils/test-helpers';
import { UserRole } from 'generated/prisma';
import { JwtService } from '@nestjs/jwt';
import { AiService } from '../src/ai/ai.service';
import { RecommendationType } from '../src/ai/dto/recommendation.dto';

describe('AI (e2e)', () => {
  let app: INestApplication;
  let mockPrisma: jest.Mocked<PrismaService>;
  let jwtService: JwtService;
  let authToken: string;
  let mockAiService: jest.Mocked<AiService>;

  beforeAll(async () => {
    mockPrisma = createMockPrisma();
    mockAiService = {
      chat: jest.fn(),
    } as any;
    
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .overrideProvider(AiService)
      .useValue(mockAiService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    jwtService = moduleFixture.get<JwtService>(JwtService);
    const mockUser = createMockUserWithoutPassword();
    authToken = jwtService.sign({
      email: mockUser.email,
      sub: mockUser.id,
      role: mockUser.role,
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /ai/chat', () => {
    it('should return 200 with general chat response', async () => {
      mockAiService.chat.mockResolvedValue({
        content: 'Hello! How can I help you?',
        intent: RecommendationType.CHAT,
      });

      const response = await request(app.getHttpServer())
        .post('/ai/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'Hello',
          count: 3,
        })
        .expect(201);

      expect(response.body).toHaveProperty('content');
      expect(response.body).toHaveProperty('intent');
      expect(response.body.intent).toBe('chat');
    });

    it('should return 200 with product recommendation response', async () => {
      mockAiService.chat.mockResolvedValue({
        content: 'Based on your preferences, I recommend these products...',
        intent: RecommendationType.PRODUCT,
        products: [
          {
            id: 1,
            name: 'Test Product',
            description: 'Test Description',
            price: '99.99',
            imageUrl: null,
            storeId: 1,
            storeName: 'Test Store',
            distance: null,
          },
        ],
      });

      const response = await request(app.getHttpServer())
        .post('/ai/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'Find me laptops',
          count: 5,
        })
        .expect(201);

      expect(response.body).toHaveProperty('content');
      expect(response.body).toHaveProperty('intent');
      expect(response.body.intent).toBe('product');
      expect(response.body).toHaveProperty('products');
      expect(Array.isArray(response.body.products)).toBe(true);
    });

    it('should return 200 with location-aware store recommendation', async () => {
      mockAiService.chat.mockResolvedValue({
        content: 'Here are some stores near you...',
        intent: RecommendationType.STORE,
        stores: [
          {
            id: 1,
            name: 'Test Store',
            description: 'Test Description',
            imageUrl: null,
            latitude: 10.3157,
            longitude: 123.8854,
            address: 'Test Address',
            city: 'Test City',
            distance: 2.5,
          },
        ],
      });

      const response = await request(app.getHttpServer())
        .post('/ai/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'Show me electronics stores near me',
          latitude: 10.3157,
          longitude: 123.8854,
          radius: 10,
          count: 3,
        })
        .expect(201);

      expect(response.body).toHaveProperty('content');
      expect(response.body).toHaveProperty('intent');
      expect(response.body.intent).toBe('store');
      expect(response.body).toHaveProperty('stores');
      expect(Array.isArray(response.body.stores)).toBe(true);
    });

    it('should return 400 when only latitude is provided', async () => {
      await request(app.getHttpServer())
        .post('/ai/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'Hello',
          latitude: 10.3157,
          count: 3,
        })
        .expect(400);
    });

    it('should return 400 when only longitude is provided', async () => {
      await request(app.getHttpServer())
        .post('/ai/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'Hello',
          longitude: 123.8854,
          count: 3,
        })
        .expect(400);
    });

    it('should return 400 when invalid radius is provided', async () => {
      await request(app.getHttpServer())
        .post('/ai/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'Hello',
          latitude: 10.3157,
          longitude: 123.8854,
          radius: 20, // Invalid: must be 5, 10, or 15
          count: 3,
        })
        .expect(400);
    });

    it('should return 401 when no auth token is provided', async () => {
      await request(app.getHttpServer())
        .post('/ai/chat')
        .send({
          content: 'Hello',
          count: 3,
        })
        .expect(401);
    });
  });
});

