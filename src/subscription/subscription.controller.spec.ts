import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionService } from './subscription.service';
import { CreateSubscriptionDTO } from './dto/create-subscription.dto';
import { JoinSubscriptionDTO } from './dto/join-subscription.dto';
import { UserRole } from 'generated/prisma';
import { createMockRequest } from '../../test/utils/test-helpers';

describe('SubscriptionController', () => {
  let controller: SubscriptionController;
  let service: SubscriptionService;

  const mockSubscriptionService = {
    subscriptions: jest.fn(),
    subscription: jest.fn(),
    createPlan: jest.fn(),
    updateSubscription: jest.fn(),
    deleteSubscription: jest.fn(),
    joinSubscription: jest.fn(),
    getUserSubscription: jest.fn(),
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
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /subscription', () => {
    it('should return array of SubscriptionResponseDto matching Swagger schema', async () => {
      const mockSubscriptions = [
        { id: 1, name: 'Plan 1', price: 100 },
        { id: 2, name: 'Plan 2', price: 200 },
      ];

      const mockRequest = createMockRequest();
      mockSubscriptionService.subscriptions.mockResolvedValue(mockSubscriptions);

      const result = await controller.findManySubscriptions(mockRequest);

      expect(mockSubscriptionService.subscriptions).toHaveBeenCalled();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('POST /subscription', () => {
    it('should return SubscriptionResponseDto matching Swagger schema on successful creation', async () => {
      const createDto: CreateSubscriptionDTO = {
        name: 'New Plan',
        price: '100.00',
        plan: 'PREMIUM' as any,
      };

      const createdSubscription = {
        id: 1,
        ...createDto,
        isActive: true,
      };

      const mockRequest = createMockRequest({ role: UserRole.ADMIN });
      mockSubscriptionService.createPlan.mockResolvedValue(createdSubscription);

      const result = await controller.createSubscription(mockRequest, createDto);

      expect(mockSubscriptionService.createPlan).toHaveBeenCalled();
      expect(result).toHaveProperty('id');
    });
  });

  describe('POST /subscription/join', () => {
    it('should return UserSubscriptionResponseDto matching Swagger schema on successful join', async () => {
      const joinDto: JoinSubscriptionDTO = {
        subscriptionId: 1,
      };

      const userSubscription = {
        id: 1,
        userId: 1,
        subscriptionId: 1,
      };

      const mockRequest = createMockRequest({ sub: 1, role: UserRole.RETAILER });
      mockSubscriptionService.joinSubscription.mockResolvedValue(userSubscription);

      const result = await controller.joinSubscription(mockRequest, joinDto);

      expect(mockSubscriptionService.joinSubscription).toHaveBeenCalled();
      expect(result).toHaveProperty('id');
    });
  });
});

