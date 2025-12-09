import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SubscriptionTierGuard } from './subscription-tier.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { TierLimitType } from '../decorators/tier-limit.decorator';
import { SubscriptionTier, UserRole } from 'generated/prisma';

describe('SubscriptionTierGuard', () => {
  let guard: SubscriptionTierGuard;
  let reflector: Reflector;
  let prisma: PrismaService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
    product: {
      count: jest.fn(),
    },
    store: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    promotion: {
      count: jest.fn(),
    },
  };

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionTierGuard,
        {
          provide: Reflector,
          useValue: mockReflector,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    guard = module.get<SubscriptionTierGuard>(SubscriptionTierGuard);
    reflector = module.get<Reflector>(Reflector);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should allow access when no tier limit is specified', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(null);

      const context = createMockExecutionContext({
        user: { sub: 1 },
      });

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should throw ForbiddenException if user not authenticated', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(
        TierLimitType.CONSUMER_RADIUS,
      );

      const context = createMockExecutionContext({});

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException if user not found', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(
        TierLimitType.CONSUMER_RADIUS,
      );
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const context = createMockExecutionContext({
        user: { sub: 999 },
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('CONSUMER_RADIUS limit', () => {
    it('should allow PRO consumer with 3km radius', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(
        TierLimitType.CONSUMER_RADIUS,
      );
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 1,
        role: UserRole.CONSUMER,
        subscriptionTier: SubscriptionTier.PRO,
      });

      const context = createMockExecutionContext({
        user: { sub: 1 },
        query: { radius: '3' },
      });

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should reject BASIC consumer with 3km radius', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(
        TierLimitType.CONSUMER_RADIUS,
      );
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 1,
        role: UserRole.CONSUMER,
        subscriptionTier: SubscriptionTier.BASIC,
      });

      const context = createMockExecutionContext({
        user: { sub: 1 },
        query: { radius: '3' },
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(guard.canActivate(context)).rejects.toThrow(
        'Your BASIC tier allows a maximum radius of 1km',
      );
    });

    it('should allow BASIC consumer with 1km radius', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(
        TierLimitType.CONSUMER_RADIUS,
      );
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 1,
        role: UserRole.CONSUMER,
        subscriptionTier: SubscriptionTier.BASIC,
      });

      const context = createMockExecutionContext({
        user: { sub: 1 },
        query: { radius: '1' },
      });

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should not apply radius limit to retailers', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(
        TierLimitType.CONSUMER_RADIUS,
      );
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 1,
        role: UserRole.RETAILER,
        subscriptionTier: SubscriptionTier.BASIC,
      });

      const context = createMockExecutionContext({
        user: { sub: 1 },
        query: { radius: '100' },
      });

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });
  });

  describe('RETAILER_PRODUCT_COUNT limit', () => {
    it('should allow PRO retailer to create unlimited products', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(
        TierLimitType.RETAILER_PRODUCT_COUNT,
      );
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 1,
        role: UserRole.RETAILER,
        subscriptionTier: SubscriptionTier.PRO,
      });

      const context = createMockExecutionContext({
        user: { sub: 1 },
        body: { storeId: 1 },
      });

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
      expect(mockPrismaService.product.count).not.toHaveBeenCalled();
    });

    it('should reject BASIC retailer at 10 product limit', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(
        TierLimitType.RETAILER_PRODUCT_COUNT,
      );
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 1,
        role: UserRole.RETAILER,
        subscriptionTier: SubscriptionTier.BASIC,
      });
      mockPrismaService.store.findUnique.mockResolvedValue({
        ownerId: 1,
      });
      mockPrismaService.product.count.mockResolvedValue(10);

      const context = createMockExecutionContext({
        user: { sub: 1 },
        body: { storeId: 1 },
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(guard.canActivate(context)).rejects.toThrow(
        'BASIC tier allows a maximum of 10 products',
      );
    });

    it('should allow BASIC retailer under 10 product limit', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(
        TierLimitType.RETAILER_PRODUCT_COUNT,
      );
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 1,
        role: UserRole.RETAILER,
        subscriptionTier: SubscriptionTier.BASIC,
      });
      mockPrismaService.store.findUnique.mockResolvedValue({
        ownerId: 1,
      });
      mockPrismaService.product.count.mockResolvedValue(5);

      const context = createMockExecutionContext({
        user: { sub: 1 },
        body: { storeId: 1 },
      });

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });
  });

  describe('RETAILER_PRODUCTS_PER_PROMOTION limit', () => {
    it('should allow PRO retailer unlimited products per promotion', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(
        TierLimitType.RETAILER_PRODUCTS_PER_PROMOTION,
      );
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 1,
        role: UserRole.RETAILER,
        subscriptionTier: SubscriptionTier.PRO,
      });

      const context = createMockExecutionContext({
        user: { sub: 1 },
        body: { productIds: Array(100).fill(1) },
      });

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should reject BASIC retailer over 10 products per promotion', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(
        TierLimitType.RETAILER_PRODUCTS_PER_PROMOTION,
      );
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 1,
        role: UserRole.RETAILER,
        subscriptionTier: SubscriptionTier.BASIC,
      });

      const context = createMockExecutionContext({
        user: { sub: 1 },
        body: { productIds: Array(11).fill(1) },
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(guard.canActivate(context)).rejects.toThrow(
        'BASIC tier allows a maximum of 10 products per promotion',
      );
    });

    it('should allow BASIC retailer with 10 or fewer products per promotion', async () => {
      mockReflector.getAllAndOverride.mockReturnValue(
        TierLimitType.RETAILER_PRODUCTS_PER_PROMOTION,
      );
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 1,
        role: UserRole.RETAILER,
        subscriptionTier: SubscriptionTier.BASIC,
      });

      const context = createMockExecutionContext({
        user: { sub: 1 },
        body: { productIds: Array(10).fill(1) },
      });

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });
  });
});

/**
 * Helper function to create mock execution context
 */
function createMockExecutionContext(request: any): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as ExecutionContext;
}

