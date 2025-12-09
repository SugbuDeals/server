import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { createMockPrisma, createMockUserWithoutPassword } from './utils/test-helpers';
import { UserRole, SubscriptionTier } from 'generated/prisma';
import { JwtService } from '@nestjs/jwt';

describe('Subscription (e2e)', () => {
  let app: INestApplication;
  let mockPrisma: jest.Mocked<PrismaService>;
  let jwtService: JwtService;
  let consumerToken: string;
  let retailerToken: string;
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
    
    // Create tokens for different roles
    consumerToken = jwtService.sign({
      email: 'consumer@test.com',
      sub: 1,
      role: UserRole.CONSUMER,
    });

    retailerToken = jwtService.sign({
      email: 'retailer@test.com',
      sub: 2,
      role: UserRole.RETAILER,
    });

    adminToken = jwtService.sign({
      email: 'admin@test.com',
      sub: 3,
      role: UserRole.ADMIN,
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /subscription/me', () => {
    it('should return current user tier information', async () => {
      const mockUser = {
        id: 1,
        email: 'consumer@test.com',
        name: 'Test Consumer',
        subscriptionTier: SubscriptionTier.BASIC,
        role: UserRole.CONSUMER,
      };

      mockPrisma.user.findUnique = jest.fn().mockResolvedValue(mockUser);

      const response = await request(app.getHttpServer())
        .get('/subscription/me')
        .set('Authorization', `Bearer ${consumerToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        userId: 1,
        email: 'consumer@test.com',
        name: 'Test Consumer',
        tier: 'BASIC',
        role: 'CONSUMER',
      });
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .get('/subscription/me')
        .expect(401);
    });
  });

  describe('POST /subscription/upgrade', () => {
    it('should upgrade retailer from BASIC to PRO', async () => {
      const mockUser = {
        id: 2,
        email: 'retailer@test.com',
        name: 'Test Retailer',
        password: 'hashed',
        role: UserRole.RETAILER,
        subscriptionTier: SubscriptionTier.BASIC,
        createdAt: new Date(),
        imageUrl: null,
      };

      const mockUpgradedUser = {
        ...mockUser,
        subscriptionTier: SubscriptionTier.PRO,
      };

      mockPrisma.user.findUnique = jest.fn().mockResolvedValue(mockUser);
      mockPrisma.user.update = jest.fn().mockResolvedValue(mockUpgradedUser);

      const response = await request(app.getHttpServer())
        .post('/subscription/upgrade')
        .set('Authorization', `Bearer ${retailerToken}`)
        .expect(201);

      expect(response.body.subscriptionTier).toBe('PRO');
    });

    it('should return 400 if already on PRO tier', async () => {
      const mockUser = {
        id: 2,
        email: 'retailer@test.com',
        name: 'Test Retailer',
        password: 'hashed',
        role: UserRole.RETAILER,
        subscriptionTier: SubscriptionTier.PRO,
        createdAt: new Date(),
        imageUrl: null,
      };

      mockPrisma.user.findUnique = jest.fn().mockResolvedValue(mockUser);

      await request(app.getHttpServer())
        .post('/subscription/upgrade')
        .set('Authorization', `Bearer ${retailerToken}`)
        .expect(400);
    });

    it('should return 403 for admin role', async () => {
      await request(app.getHttpServer())
        .post('/subscription/upgrade')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);
    });
  });

  describe('POST /subscription/downgrade', () => {
    it('should downgrade retailer from PRO to BASIC', async () => {
      const mockUser = {
        id: 2,
        email: 'retailer@test.com',
        name: 'Test Retailer',
        password: 'hashed',
        role: UserRole.RETAILER,
        subscriptionTier: SubscriptionTier.PRO,
        createdAt: new Date(),
        imageUrl: null,
      };

      const mockDowngradedUser = {
        ...mockUser,
        subscriptionTier: SubscriptionTier.BASIC,
      };

      mockPrisma.user.findUnique = jest.fn().mockResolvedValue(mockUser);
      mockPrisma.user.update = jest.fn().mockResolvedValue(mockDowngradedUser);

      const response = await request(app.getHttpServer())
        .post('/subscription/downgrade')
        .set('Authorization', `Bearer ${retailerToken}`)
        .expect(201);

      expect(response.body.subscriptionTier).toBe('BASIC');
    });

    it('should return 400 if already on BASIC tier', async () => {
      const mockUser = {
        id: 2,
        email: 'retailer@test.com',
        name: 'Test Retailer',
        password: 'hashed',
        role: UserRole.RETAILER,
        subscriptionTier: SubscriptionTier.BASIC,
        createdAt: new Date(),
        imageUrl: null,
      };

      mockPrisma.user.findUnique = jest.fn().mockResolvedValue(mockUser);

      await request(app.getHttpServer())
        .post('/subscription/downgrade')
        .set('Authorization', `Bearer ${retailerToken}`)
        .expect(400);
    });
  });

  describe('GET /subscription/analytics', () => {
    it('should return analytics for admin', async () => {
      const mockUsers = [
        { id: 1, role: UserRole.CONSUMER, subscriptionTier: SubscriptionTier.BASIC },
        { id: 2, role: UserRole.CONSUMER, subscriptionTier: SubscriptionTier.PRO },
        { id: 3, role: UserRole.RETAILER, subscriptionTier: SubscriptionTier.BASIC },
        { id: 4, role: UserRole.RETAILER, subscriptionTier: SubscriptionTier.PRO },
      ];

      mockPrisma.user.findMany = jest.fn().mockResolvedValue(mockUsers);

      const response = await request(app.getHttpServer())
        .get('/subscription/analytics')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        totalUsers: 4,
        basicUsers: 2,
        proUsers: 2,
        byRoleAndTier: expect.any(Object),
        revenue: expect.objectContaining({
          monthly: 200, // 2 PRO users * 100 PHP
          currency: 'PHP',
        }),
      });
    });

    it('should return 403 for non-admin users', async () => {
      await request(app.getHttpServer())
        .get('/subscription/analytics')
        .set('Authorization', `Bearer ${retailerToken}`)
        .expect(403);
    });
  });
});
