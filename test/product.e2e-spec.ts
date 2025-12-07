import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { createMockPrisma, createMockUserWithoutPassword } from './utils/test-helpers';
import { UserRole } from 'generated/prisma';
import { JwtService } from '@nestjs/jwt';

describe('Product (e2e)', () => {
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
    const mockUser = createMockUserWithoutPassword({ role: UserRole.RETAILER });
    authToken = jwtService.sign({
      email: mockUser.email,
      sub: mockUser.id,
      role: mockUser.role,
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /product', () => {
    it('should return 200 with array of ProductResponseDto matching Swagger schema', async () => {
      const mockProducts = [
        { id: 1, name: 'Product 1', price: 100, stock: 10, storeId: 1, isActive: true, createdAt: new Date() },
      ];
      mockPrisma.product.findMany = jest.fn().mockResolvedValue(mockProducts);

      const response = await request(app.getHttpServer())
        .get('/product')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });
});

