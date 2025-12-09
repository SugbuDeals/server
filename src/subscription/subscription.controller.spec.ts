import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionService } from './subscription.service';
import { SubscriptionTier, UserRole } from 'generated/prisma';
import { BadRequestException } from '@nestjs/common';

describe('SubscriptionController', () => {
  let controller: SubscriptionController;
  let service: SubscriptionService;

  const mockSubscriptionService = {
    getCurrentTier: jest.fn(),
    upgradeToPro: jest.fn(),
    downgradeToBasic: jest.fn(),
    getAnalytics: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SubscriptionController],
      providers: [
        {
          provide: SubscriptionService,
          useValue: mockSubscriptionService,
        },
      ],
    }).compile();

    controller = module.get<SubscriptionController>(SubscriptionController);
    service = module.get<SubscriptionService>(SubscriptionService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getCurrentTier', () => {
    it('should return current user tier', async () => {
      const mockRequest = {
        user: {
          sub: 1,
          email: 'test@example.com',
          role: UserRole.CONSUMER,
        },
      } as any;

      const mockTierResponse = {
        userId: 1,
        email: 'test@example.com',
        name: 'Test User',
        tier: SubscriptionTier.BASIC,
        role: UserRole.CONSUMER,
      };

      mockSubscriptionService.getCurrentTier.mockResolvedValue(
        mockTierResponse,
      );

      const result = await controller.getCurrentTier(mockRequest);

      expect(result).toEqual(mockTierResponse);
      expect(mockSubscriptionService.getCurrentTier).toHaveBeenCalledWith(1);
    });
  });

  describe('upgradeToPro', () => {
    it('should upgrade user to PRO tier', async () => {
      const mockRequest = {
        user: {
          sub: 1,
          email: 'retailer@example.com',
          role: UserRole.RETAILER,
        },
      } as any;

      const mockUpgradedUser = {
        id: 1,
        email: 'retailer@example.com',
        name: 'Retailer User',
        role: UserRole.RETAILER,
        subscriptionTier: SubscriptionTier.PRO,
        createdAt: new Date(),
        imageUrl: null,
      };

      mockSubscriptionService.upgradeToPro.mockResolvedValue(mockUpgradedUser);

      const result = await controller.upgradeToPro(mockRequest);

      expect(result).toEqual(mockUpgradedUser);
      expect(mockSubscriptionService.upgradeToPro).toHaveBeenCalledWith(1);
    });

    it('should throw BadRequestException if already PRO', async () => {
      const mockRequest = {
        user: {
          sub: 1,
          email: 'retailer@example.com',
          role: UserRole.RETAILER,
        },
      } as any;

      mockSubscriptionService.upgradeToPro.mockRejectedValue(
        new BadRequestException('User already has PRO tier'),
      );

      await expect(controller.upgradeToPro(mockRequest)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('downgradeToBasic', () => {
    it('should downgrade user to BASIC tier', async () => {
      const mockRequest = {
        user: {
          sub: 1,
          email: 'retailer@example.com',
          role: UserRole.RETAILER,
        },
      } as any;

      const mockDowngradedUser = {
        id: 1,
        email: 'retailer@example.com',
        name: 'Retailer User',
        role: UserRole.RETAILER,
        subscriptionTier: SubscriptionTier.BASIC,
        createdAt: new Date(),
        imageUrl: null,
      };

      mockSubscriptionService.downgradeToBasic.mockResolvedValue(
        mockDowngradedUser,
      );

      const result = await controller.downgradeToBasic(mockRequest);

      expect(result).toEqual(mockDowngradedUser);
      expect(mockSubscriptionService.downgradeToBasic).toHaveBeenCalledWith(1);
    });

    it('should throw BadRequestException if already BASIC', async () => {
      const mockRequest = {
        user: {
          sub: 1,
          email: 'retailer@example.com',
          role: UserRole.RETAILER,
        },
      } as any;

      mockSubscriptionService.downgradeToBasic.mockRejectedValue(
        new BadRequestException('User already has BASIC tier'),
      );

      await expect(controller.downgradeToBasic(mockRequest)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getAnalytics', () => {
    it('should return subscription analytics for admin', async () => {
      const mockRequest = {
        user: {
          sub: 1,
          email: 'admin@example.com',
          role: UserRole.ADMIN,
        },
      } as any;

      const mockAnalytics = {
        totalUsers: 100,
        basicUsers: 60,
        proUsers: 40,
        byRoleAndTier: {
          consumer: {
            basic: 30,
            pro: 20,
            total: 50,
          },
          retailer: {
            basic: 25,
            pro: 15,
            total: 40,
          },
          admin: {
            basic: 5,
            pro: 5,
            total: 10,
          },
        },
        revenue: {
          monthly: 4000,
          yearly: 48000,
          currency: 'PHP',
        },
      };

      mockSubscriptionService.getAnalytics.mockResolvedValue(mockAnalytics);

      const result = await controller.getAnalytics(mockRequest);

      expect(result).toEqual(mockAnalytics);
      expect(mockSubscriptionService.getAnalytics).toHaveBeenCalled();
    });
  });
});
