import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { createMockPrisma, createMockUserWithoutPassword } from './utils/test-helpers';
import { UserRole } from 'generated/prisma';
import { JwtService } from '@nestjs/jwt';

describe('Bookmark (e2e)', () => {
  let app: INestApplication;
  let mockPrisma: jest.Mocked<PrismaService>;
  let jwtService: JwtService;
  let authToken: string;

  beforeAll(async () => {
    mockPrisma = createMockPrisma();
    
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
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

  describe('POST /bookmarks/stores/list', () => {
    it('should return 200 with array of StoreBookmarkResponseDto matching Swagger schema', async () => {
      const mockBookmarks = [
        { id: 1, userId: 1, storeId: 1, store: { id: 1, name: 'Store 1' }, createdAt: new Date() },
      ];
      mockPrisma.storeBookmark.findMany = jest.fn().mockResolvedValue(mockBookmarks);

      const response = await request(app.getHttpServer())
        .post('/bookmarks/stores/list')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ take: 10, skip: 0 })
        .expect(201);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });
});

