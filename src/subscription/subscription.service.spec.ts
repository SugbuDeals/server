import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionService } from './subscription.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';
import { SubscriptionTier, UserRole } from 'generated/prisma';

describe('SubscriptionService', () => {
  let service: SubscriptionService;
  let prisma: PrismaService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<SubscriptionService>(SubscriptionService);
    prisma = module.get<PrismaService>(PrismaService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('upgradeToPro', () => {
    it('should upgrade user from BASIC to PRO tier', async () => {
      const userId = 1;
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashedpassword',
        role: UserRole.RETAILER,
        subscriptionTier: SubscriptionTier.BASIC,
        createdAt: new Date(),
        imageUrl: null,
      };

      const mockUpdatedUser = {
        ...mockUser,
        subscriptionTier: SubscriptionTier.PRO,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue(mockUpdatedUser);

      const result = await service.upgradeToPro(userId);

      expect(result).toEqual({
        id: userId,
        email: 'test@example.com',
        name: 'Test User',
        role: UserRole.RETAILER,
        subscriptionTier: SubscriptionTier.PRO,
        createdAt: expect.any(Date),
        imageUrl: null,
      });
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { subscriptionTier: SubscriptionTier.PRO },
      });
    });

    it('should throw BadRequestException if user not found', async () => {
      const userId = 999;
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.upgradeToPro(userId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.upgradeToPro(userId)).rejects.toThrow(
        'User not found',
      );
    });

    it('should throw BadRequestException if user already has PRO tier', async () => {
      const userId = 1;
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashedpassword',
        role: UserRole.RETAILER,
        subscriptionTier: SubscriptionTier.PRO,
        createdAt: new Date(),
        imageUrl: null,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      await expect(service.upgradeToPro(userId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.upgradeToPro(userId)).rejects.toThrow(
        'User already has PRO tier',
      );
      expect(mockPrismaService.user.update).not.toHaveBeenCalled();
    });
  });

  describe('downgradeToBasic', () => {
    it('should downgrade user from PRO to BASIC tier', async () => {
      const userId = 1;
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashedpassword',
        role: UserRole.RETAILER,
        subscriptionTier: SubscriptionTier.PRO,
        createdAt: new Date(),
        imageUrl: null,
      };

      const mockUpdatedUser = {
        ...mockUser,
        subscriptionTier: SubscriptionTier.BASIC,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue(mockUpdatedUser);

      const result = await service.downgradeToBasic(userId);

      expect(result).toEqual({
        id: userId,
        email: 'test@example.com',
        name: 'Test User',
        role: UserRole.RETAILER,
        subscriptionTier: SubscriptionTier.BASIC,
        createdAt: expect.any(Date),
        imageUrl: null,
      });
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { subscriptionTier: SubscriptionTier.BASIC },
      });
    });

    it('should throw BadRequestException if user not found', async () => {
      const userId = 999;
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.downgradeToBasic(userId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if user already has BASIC tier', async () => {
      const userId = 1;
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashedpassword',
        role: UserRole.RETAILER,
        subscriptionTier: SubscriptionTier.BASIC,
        createdAt: new Date(),
        imageUrl: null,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      await expect(service.downgradeToBasic(userId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.downgradeToBasic(userId)).rejects.toThrow(
        'User already has BASIC tier',
      );
      expect(mockPrismaService.user.update).not.toHaveBeenCalled();
    });
  });

  describe('getCurrentTier', () => {
    it('should return current tier information for user', async () => {
      const userId = 1;
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        name: 'Test User',
        subscriptionTier: SubscriptionTier.PRO,
        role: UserRole.CONSUMER,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getCurrentTier(userId);

      expect(result).toEqual({
        userId: 1,
        email: 'test@example.com',
        name: 'Test User',
        tier: SubscriptionTier.PRO,
        role: UserRole.CONSUMER,
      });
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        select: {
          id: true,
          subscriptionTier: true,
          role: true,
          email: true,
          name: true,
        },
      });
    });

    it('should throw BadRequestException if user not found', async () => {
      const userId = 999;
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getCurrentTier(userId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.getCurrentTier(userId)).rejects.toThrow(
        'User not found',
      );
    });
  });

  describe('getAnalytics', () => {
    it('should return subscription analytics', async () => {
      const mockUsers = [
        {
          id: 1,
          role: UserRole.CONSUMER,
          subscriptionTier: SubscriptionTier.BASIC,
        },
        {
          id: 2,
          role: UserRole.CONSUMER,
          subscriptionTier: SubscriptionTier.PRO,
        },
        {
          id: 3,
          role: UserRole.RETAILER,
          subscriptionTier: SubscriptionTier.BASIC,
        },
        {
          id: 4,
          role: UserRole.RETAILER,
          subscriptionTier: SubscriptionTier.PRO,
        },
        {
          id: 5,
          role: UserRole.ADMIN,
          subscriptionTier: SubscriptionTier.BASIC,
        },
      ];

      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);

      const result = await service.getAnalytics();

      expect(result).toEqual({
        totalUsers: 5,
        basicUsers: 3,
        proUsers: 2,
        byRoleAndTier: {
          consumer: {
            basic: 1,
            pro: 1,
            total: 2,
          },
          retailer: {
            basic: 1,
            pro: 1,
            total: 2,
          },
          admin: {
            basic: 1,
            pro: 0,
            total: 1,
          },
        },
        revenue: {
          monthly: 200, // 2 PRO users * 100 PHP
          yearly: 2400,
          currency: 'PHP',
        },
      });
    });

    it('should return zero analytics when no users', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([]);

      const result = await service.getAnalytics();

      expect(result.totalUsers).toBe(0);
      expect(result.basicUsers).toBe(0);
      expect(result.proUsers).toBe(0);
      expect(result.revenue.monthly).toBe(0);
    });
  });
});

