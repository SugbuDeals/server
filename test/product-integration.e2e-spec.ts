import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { createMockPrisma, createMockUserWithoutPassword } from './utils/test-helpers';
import { UserRole } from 'generated/prisma';
import { JwtService } from '@nestjs/jwt';

describe('Product Integration (e2e)', () => {
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
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    jwtService = moduleFixture.get<JwtService>(JwtService);
    const mockUser = createMockUserWithoutPassword({ role: UserRole.CONSUMER });
    authToken = jwtService.sign({
      email: mockUser.email,
      sub: mockUser.id,
      role: mockUser.role,
    });
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /product/with-details', () => {
    it('should return paginated products with store and promotions', async () => {
      const mockProducts = [
        {
          id: 1,
          name: 'iPhone 15',
          price: '999.99',
          stock: 50,
          isActive: true,
          storeId: 1,
          categoryId: null,
          createdAt: new Date(),
          description: 'Latest iPhone',
          imageUrl: null,
          store: {
            id: 1,
            name: 'Electronics Store',
            verificationStatus: 'VERIFIED',
          },
          promotionProducts: [
            {
              promotion: {
                id: 1,
                title: 'Black Friday Sale',
                dealType: 'PERCENTAGE_DISCOUNT',
                percentageOff: 20,
                active: true,
              },
            },
          ],
        },
      ];

      mockPrisma.product.count = jest.fn().mockResolvedValue(45);
      mockPrisma.product.findMany = jest.fn().mockResolvedValue(mockProducts);

      const response = await request(app.getHttpServer())
        .get('/product/with-details?includeStore=true&includePromotions=true&skip=0&take=20')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination).toHaveProperty('skip', 0);
      expect(response.body.pagination).toHaveProperty('take', 20);
      expect(response.body.pagination).toHaveProperty('total', 45);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter products by storeId', async () => {
      mockPrisma.product.count = jest.fn().mockResolvedValue(10);
      mockPrisma.product.findMany = jest.fn().mockResolvedValue([]);

      await request(app.getHttpServer())
        .get('/product/with-details?storeId=1&skip=0&take=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(mockPrisma.product.findMany).toHaveBeenCalled();
    });

    it('should return 400 for invalid skip parameter', async () => {
      await request(app.getHttpServer())
        .get('/product/with-details?skip=-1&take=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });

    it('should return 400 for invalid take parameter (too high)', async () => {
      await request(app.getHttpServer())
        .get('/product/with-details?skip=0&take=200')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });

    it('should return 400 for invalid take parameter (too low)', async () => {
      await request(app.getHttpServer())
        .get('/product/with-details?skip=0&take=0')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });

    it('should return 400 for invalid storeId', async () => {
      await request(app.getHttpServer())
        .get('/product/with-details?storeId=invalid')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });

    it('should return 401 without auth token', async () => {
      await request(app.getHttpServer())
        .get('/product/with-details')
        .expect(401);
    });
  });

  describe('GET /product/:id/full', () => {
    it('should return product with store and promotions', async () => {
      const mockProduct = {
        id: 1,
        name: 'iPhone 15',
        price: '999.99',
        stock: 50,
        isActive: true,
        storeId: 1,
        categoryId: null,
        createdAt: new Date(),
        description: 'Latest iPhone',
        imageUrl: null,
        store: {
          id: 1,
          name: 'Electronics Store',
          description: 'Best electronics',
          verificationStatus: 'VERIFIED',
          isActive: true,
        },
        promotionProducts: [
          {
            promotion: {
              id: 1,
              title: 'Black Friday Sale',
              dealType: 'PERCENTAGE_DISCOUNT',
              description: '20% off',
              percentageOff: 20,
              active: true,
              startsAt: new Date(),
              endsAt: null,
            },
          },
        ],
      };

      mockPrisma.product.findUnique = jest.fn().mockResolvedValue(mockProduct);

      const response = await request(app.getHttpServer())
        .get('/product/1/full?includeStore=true&includePromotions=true')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', 1);
      expect(response.body).toHaveProperty('store');
      expect(response.body.store).toHaveProperty('name', 'Electronics Store');
      expect(response.body).toHaveProperty('promotions');
      expect(Array.isArray(response.body.promotions)).toBe(true);
    });

    it('should return product without optional includes when not specified', async () => {
      const mockProduct = {
        id: 1,
        name: 'iPhone 15',
        price: '999.99',
        stock: 50,
        isActive: true,
        storeId: 1,
        categoryId: null,
        createdAt: new Date(),
        description: 'Latest iPhone',
        imageUrl: null,
      };

      mockPrisma.product.findUnique = jest.fn().mockResolvedValue(mockProduct);

      const response = await request(app.getHttpServer())
        .get('/product/1/full')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', 1);
      expect(response.body).not.toHaveProperty('store');
      expect(response.body).not.toHaveProperty('promotions');
    });

    it('should return 400 for invalid product id', async () => {
      await request(app.getHttpServer())
        .get('/product/invalid/full')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });

    it('should return 401 without auth token', async () => {
      await request(app.getHttpServer())
        .get('/product/1/full')
        .expect(401);
    });
  });
});
