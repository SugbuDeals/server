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
      generateText: jest.fn(),
      getRecommendationsFromQuery: jest.fn(),
      getSimilarProducts: jest.fn(),
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
    it('should return 200 with chat response matching Swagger schema', async () => {
      mockAiService.chat.mockResolvedValue({
        content: 'Hello! How can I help you?',
        role: 'assistant',
      });

      const response = await request(app.getHttpServer())
        .post('/ai/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          messages: [{ role: 'user', content: 'Hello' }],
        })
        .expect(201);

      expect(response.body).toHaveProperty('content');
      expect(response.body).toHaveProperty('role');
    });
  });
});

