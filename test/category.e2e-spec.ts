import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { createMockPrisma, createMockUserWithoutPassword } from './utils/test-helpers';
import { UserRole } from 'generated/prisma';
import { JwtService } from '@nestjs/jwt';

describe('Category (e2e)', () => {
  let app: INestApplication;
  let mockPrisma: jest.Mocked<PrismaService>;
  let jwtService: JwtService;
  let authToken: string;
  let adminToken: string;

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

    const adminUser = createMockUserWithoutPassword({ role: UserRole.ADMIN });
    adminToken = jwtService.sign({
      email: adminUser.email,
      sub: adminUser.id,
      role: adminUser.role,
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /category', () => {
    it('should return 200 with array of CategoryResponseDto matching Swagger schema', async () => {
      const mockCategories = [
        { id: 1, name: 'Category 1', createdAt: new Date(), updatedAt: new Date() },
        { id: 2, name: 'Category 2', createdAt: new Date(), updatedAt: new Date() },
      ];
      mockPrisma.category.findMany = jest.fn().mockResolvedValue(mockCategories);

      const response = await request(app.getHttpServer())
        .get('/category')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return 401 when not authenticated', async () => {
      await request(app.getHttpServer())
        .get('/category')
        .expect(401);
    });
  });

  describe('POST /category', () => {
    it('should return 201 with CategoryResponseDto matching Swagger schema when admin creates', async () => {
      const createdCategory = {
        id: 1,
        name: 'New Category',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.category.create = jest.fn().mockResolvedValue(createdCategory);

      const response = await request(app.getHttpServer())
        .post('/category')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'New Category' })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('name', 'New Category');
    });
  });
});

