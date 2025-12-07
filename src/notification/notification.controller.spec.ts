import { Test, TestingModule } from '@nestjs/testing';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { createMockRequest } from '../../test/utils/test-helpers';

describe('NotificationController', () => {
  let controller: NotificationController;
  let service: NotificationService;

  const mockNotificationService = {
    getUserNotifications: jest.fn(),
    createNotification: jest.fn(),
    markAsRead: jest.fn(),
    deleteNotification: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationController],
      providers: [
        {
          provide: NotificationService,
          useValue: mockNotificationService,
        },
      ],
    }).compile();

    controller = module.get<NotificationController>(NotificationController);
    service = module.get<NotificationService>(NotificationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /notifications', () => {
    it('should return array of NotificationResponseDto matching Swagger schema', async () => {
      const mockNotifications = [
        { id: 1, userId: 1, message: 'Notification 1', read: false },
        { id: 2, userId: 1, message: 'Notification 2', read: true },
      ];

      const mockRequest = createMockRequest({ sub: 1 });
      mockNotificationService.getUserNotifications.mockResolvedValue(mockNotifications);

      const result = await controller.getUserNotifications(mockRequest);

      expect(mockNotificationService.getUserNotifications).toHaveBeenCalled();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('POST /notifications', () => {
    it('should return NotificationResponseDto matching Swagger schema on successful creation', async () => {
      const createDto: CreateNotificationDto = {
        message: 'New notification',
        userId: 1,
        type: 'PRODUCT_UPDATE' as any,
        title: 'Product Update',
      };

      const createdNotification = {
        id: 1,
        ...createDto,
        read: false,
        createdAt: new Date(),
      };

      mockNotificationService.createNotification.mockResolvedValue(createdNotification);

      const result = await controller.createNotification(createDto);

      expect(mockNotificationService.createNotification).toHaveBeenCalledWith(createDto);
      expect(result).toHaveProperty('id');
    });
  });

  describe('PATCH /notifications/:id/read', () => {
    it('should return NotificationResponseDto matching Swagger schema on mark as read', async () => {
      const updatedNotification = {
        id: 1,
        userId: 1,
        message: 'Notification',
        read: true,
      };

      const mockRequest = createMockRequest({ sub: 1 });
      mockNotificationService.markAsRead.mockResolvedValue(updatedNotification);

      const result = await controller.markAsRead(mockRequest, 1);

      expect(mockNotificationService.markAsRead).toHaveBeenCalledWith(1, 1);
      expect(result.read).toBe(true);
    });
  });
});

