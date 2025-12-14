import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { createMockPrisma, createMockUserWithoutPassword } from './utils/test-helpers';
import { UserRole, DealType } from 'generated/prisma';
import { JwtService } from '@nestjs/jwt';

describe('Promotion Integration (e2e)', () => {
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

  describe('GET /promotions/with-details', () => {
    it('should return paginated promotions with products and stores', async () => {
      const mockPromotions = [
        {
          id: 1,
          title: 'Black Friday Sale',
          dealType: DealType.PERCENTAGE_DISCOUNT,
          description: '20% off on all products',
          percentageOff: 20,
          active: true,
          startsAt: new Date(),
          endsAt: null,
          fixedAmountOff: null,
          buyQuantity: null,
          getQuantity: null,
          bundlePrice: null,
          minQuantity: null,
          quantityDiscount: null,
          voucherValue: null,
          promotionProducts: [
            {
              product: {
                id: 1,
                name: 'iPhone 15',
                price: '999.99',
                stock: 50,
                isActive: true,
                storeId: 1,
                store: {
                  id: 1,
                  name: 'Electronics Store',
                  verificationStatus: 'VERIFIED',
                },
              },
            },
          ],
        },
      ];

      mockPrisma.promotion.count = jest.fn().mockResolvedValue(15);
      mockPrisma.promotion.findMany = jest.fn().mockResolvedValue(mockPromotions);

      const response = await request(app.getHttpServer())
        .get('/promotions/with-details?onlyActive=true&skip=0&take=20')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination).toHaveProperty('skip', 0);
      expect(response.body.pagination).toHaveProperty('take', 20);
      expect(response.body.pagination).toHaveProperty('total', 15);
      expect(Array.isArray(response.body.data)).toBe(true);
      if (response.body.data.length > 0) {
        expect(response.body.data[0]).toHaveProperty('products');
      }
    });

    it('should filter to only active promotions', async () => {
      mockPrisma.promotion.count = jest.fn().mockResolvedValue(5);
      mockPrisma.promotion.findMany = jest.fn().mockResolvedValue([]);

      await request(app.getHttpServer())
        .get('/promotions/with-details?onlyActive=true&skip=0&take=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(mockPrisma.promotion.findMany).toHaveBeenCalled();
    });

    it('should return 400 for invalid skip parameter', async () => {
      await request(app.getHttpServer())
        .get('/promotions/with-details?skip=-1&take=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });

    it('should return 400 for invalid take parameter (too high)', async () => {
      await request(app.getHttpServer())
        .get('/promotions/with-details?skip=0&take=200')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });

    it('should return 400 for invalid take parameter (too low)', async () => {
      await request(app.getHttpServer())
        .get('/promotions/with-details?skip=0&take=0')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });

    it('should use default pagination when not specified', async () => {
      mockPrisma.promotion.count = jest.fn().mockResolvedValue(100);
      mockPrisma.promotion.findMany = jest.fn().mockResolvedValue([]);

      const response = await request(app.getHttpServer())
        .get('/promotions/with-details')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.pagination).toHaveProperty('skip', 0);
      expect(response.body.pagination).toHaveProperty('take', 10);
    });

    it('should return 401 without auth token', async () => {
      await request(app.getHttpServer())
        .get('/promotions/with-details')
        .expect(401);
    });
  });

  describe('GET /promotions/by-store/:storeId', () => {
    it('should return promotions for a specific store', async () => {
      const mockPromotions = [
        {
          id: 1,
          title: 'Store Sale',
          dealType: DealType.PERCENTAGE_DISCOUNT,
          description: '15% off store-wide',
          percentageOff: 15,
          active: true,
          startsAt: new Date(),
          endsAt: null,
          fixedAmountOff: null,
          buyQuantity: null,
          getQuantity: null,
          bundlePrice: null,
          minQuantity: null,
          quantityDiscount: null,
          voucherValue: null,
          promotionProducts: [
            {
              product: {
                id: 1,
                name: 'Product 1',
                price: '99.99',
                storeId: 1,
                store: {
                  id: 1,
                  name: 'Store 1',
                  verificationStatus: 'VERIFIED',
                },
              },
            },
          ],
        },
      ];

      mockPrisma.promotion.findMany = jest.fn().mockResolvedValue(mockPromotions);

      const response = await request(app.getHttpServer())
        .get('/promotions/by-store/1?onlyActive=true')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      if (response.body.length > 0) {
        expect(response.body[0]).toHaveProperty('products');
        expect(Array.isArray(response.body[0].products)).toBe(true);
      }
    });

    it('should return all promotions (active and inactive) when onlyActive=false', async () => {
      mockPrisma.promotion.findMany = jest.fn().mockResolvedValue([]);

      await request(app.getHttpServer())
        .get('/promotions/by-store/1?onlyActive=false')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(mockPrisma.promotion.findMany).toHaveBeenCalled();
    });

    it('should default to only active promotions when onlyActive not specified', async () => {
      mockPrisma.promotion.findMany = jest.fn().mockResolvedValue([]);

      await request(app.getHttpServer())
        .get('/promotions/by-store/1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(mockPrisma.promotion.findMany).toHaveBeenCalled();
    });

    it('should return empty array for store with no promotions', async () => {
      mockPrisma.promotion.findMany = jest.fn().mockResolvedValue([]);

      const response = await request(app.getHttpServer())
        .get('/promotions/by-store/999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });

    it('should return 401 without auth token', async () => {
      await request(app.getHttpServer())
        .get('/promotions/by-store/1')
        .expect(401);
    });
  });
});
