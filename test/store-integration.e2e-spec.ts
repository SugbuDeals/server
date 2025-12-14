import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { createMockPrisma, createMockUserWithoutPassword } from './utils/test-helpers';
import { UserRole, SubscriptionTier } from 'generated/prisma';
import { JwtService } from '@nestjs/jwt';

describe('Store Integration (e2e)', () => {
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
    const mockUser = createMockUserWithoutPassword({ 
      role: UserRole.CONSUMER,
      subscriptionTier: SubscriptionTier.PRO
    });
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

  describe('GET /store/:id/full', () => {
    it('should return store with products and promotions', async () => {
      const mockStore = {
        id: 1,
        name: 'Electronics Store',
        description: 'Best electronics',
        verificationStatus: 'VERIFIED',
        isActive: true,
        ownerId: 1,
        createdAt: new Date(),
        imageUrl: null,
        bannerUrl: null,
        latitude: null,
        longitude: null,
        address: null,
        city: null,
        state: null,
        country: null,
        postalCode: null,
        products: [
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
                  fixedAmountOff: null,
                  buyQuantity: null,
                  getQuantity: null,
                  bundlePrice: null,
                  minQuantity: null,
                  quantityDiscount: null,
                  voucherValue: null,
                },
              },
            ],
          },
        ],
      };

      mockPrisma.store.findUnique = jest.fn().mockResolvedValue(mockStore);

      const response = await request(app.getHttpServer())
        .get('/store/1/full?includeProducts=true&includePromotions=true')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', 1);
      expect(response.body).toHaveProperty('products');
      expect(Array.isArray(response.body.products)).toBe(true);
      expect(response.body.products[0]).toHaveProperty('promotions');
    });

    it('should return 400 for invalid store id', async () => {
      await request(app.getHttpServer())
        .get('/store/invalid/full')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });

    it('should return 401 without auth token', async () => {
      await request(app.getHttpServer())
        .get('/store/1/full')
        .expect(401);
    });
  });

  describe('GET /store/nearby-with-promotions', () => {
    it('should return nearby stores with promotions', async () => {
      const mockStores = [
        {
          id: 1,
          name: 'Electronics Store',
          distance: 2.5,
          latitude: 10.3157,
          longitude: 123.8854,
          verificationStatus: 'VERIFIED',
          isActive: true,
          ownerId: 1,
          createdAt: new Date(),
          description: 'Best electronics',
          imageUrl: null,
          bannerUrl: null,
          address: null,
          city: null,
          state: null,
          country: null,
          postalCode: null,
        },
      ];

      const mockPromotions = [
        {
          id: 1,
          title: 'Black Friday Sale',
          dealType: 'PERCENTAGE_DISCOUNT',
          description: '20% off',
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
                storeId: 1,
                store: mockStores[0],
              },
            },
          ],
        },
      ];

      mockPrisma.$queryRaw = jest.fn().mockResolvedValue(mockStores);
      mockPrisma.promotion.findMany = jest.fn().mockResolvedValue(mockPromotions);

      const response = await request(app.getHttpServer())
        .get('/store/nearby-with-promotions?latitude=10.3157&longitude=123.8854&radius=5')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('stores');
      expect(response.body).toHaveProperty('promotions');
      expect(response.body).toHaveProperty('searchParams');
      expect(Array.isArray(response.body.stores)).toBe(true);
      expect(Array.isArray(response.body.promotions)).toBe(true);
    });

    it('should return 400 for invalid latitude', async () => {
      await request(app.getHttpServer())
        .get('/store/nearby-with-promotions?latitude=invalid&longitude=123.8854&radius=5')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });

    it('should return 400 for out of range latitude', async () => {
      await request(app.getHttpServer())
        .get('/store/nearby-with-promotions?latitude=100&longitude=123.8854&radius=5')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });

    it('should return 400 for invalid longitude', async () => {
      await request(app.getHttpServer())
        .get('/store/nearby-with-promotions?latitude=10.3157&longitude=invalid&radius=5')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });

    it('should return 400 for negative radius', async () => {
      await request(app.getHttpServer())
        .get('/store/nearby-with-promotions?latitude=10.3157&longitude=123.8854&radius=-5')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });
  });
});
