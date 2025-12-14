import { Test, TestingModule } from '@nestjs/testing';
import { ViewController } from './view.controller';
import { ViewService } from './view.service';
import { RecordViewDto } from './dto/record-view.dto';
import { ListViewsDto } from './dto/list-views.dto';
import { EntityType } from 'generated/prisma';
import { createMockRequest } from '../../test/utils/test-helpers';

describe('ViewController', () => {
  let controller: ViewController;
  let service: ViewService;

  const mockViewService = {
    recordView: jest.fn(),
    getUserViews: jest.fn(),
    getEntityViews: jest.fn(),
    getEntityViewCount: jest.fn(),
    hasUserViewed: jest.fn(),
    getUserEntityView: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ViewController],
      providers: [
        {
          provide: ViewService,
          useValue: mockViewService,
        },
      ],
    }).compile();

    controller = module.get<ViewController>(ViewController);
    service = module.get<ViewService>(ViewService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /views', () => {
    it('should record a new product view', async () => {
      const recordViewDto: RecordViewDto = {
        entityType: EntityType.PRODUCT,
        entityId: 42,
      };

      const mockView = {
        id: 1,
        userId: 5,
        entityType: EntityType.PRODUCT,
        entityId: 42,
        viewedAt: new Date('2024-01-01T00:00:00.000Z'),
      };

      const mockRequest = createMockRequest({ sub: 5 });
      mockViewService.recordView.mockResolvedValue(mockView);

      const result = await controller.recordView(mockRequest, recordViewDto);

      expect(mockViewService.recordView).toHaveBeenCalledWith(
        5,
        EntityType.PRODUCT,
        42,
      );
      expect(result).toEqual(mockView);
      expect(result.entityType).toBe(EntityType.PRODUCT);
      expect(result.entityId).toBe(42);
    });

    it('should record a store view', async () => {
      const recordViewDto: RecordViewDto = {
        entityType: EntityType.STORE,
        entityId: 1,
      };

      const mockView = {
        id: 2,
        userId: 5,
        entityType: EntityType.STORE,
        entityId: 1,
        viewedAt: new Date('2024-01-01T00:00:00.000Z'),
      };

      const mockRequest = createMockRequest({ sub: 5 });
      mockViewService.recordView.mockResolvedValue(mockView);

      const result = await controller.recordView(mockRequest, recordViewDto);

      expect(mockViewService.recordView).toHaveBeenCalledWith(
        5,
        EntityType.STORE,
        1,
      );
      expect(result.entityType).toBe(EntityType.STORE);
    });

    it('should record a promotion view', async () => {
      const recordViewDto: RecordViewDto = {
        entityType: EntityType.PROMOTION,
        entityId: 7,
      };

      const mockView = {
        id: 3,
        userId: 5,
        entityType: EntityType.PROMOTION,
        entityId: 7,
        viewedAt: new Date('2024-01-01T00:00:00.000Z'),
      };

      const mockRequest = createMockRequest({ sub: 5 });
      mockViewService.recordView.mockResolvedValue(mockView);

      const result = await controller.recordView(mockRequest, recordViewDto);

      expect(mockViewService.recordView).toHaveBeenCalledWith(
        5,
        EntityType.PROMOTION,
        7,
      );
      expect(result.entityType).toBe(EntityType.PROMOTION);
    });

    it('should update viewedAt timestamp on subsequent views', async () => {
      const recordViewDto: RecordViewDto = {
        entityType: EntityType.PRODUCT,
        entityId: 42,
      };

      const mockViewFirstTime = {
        id: 1,
        userId: 5,
        entityType: EntityType.PRODUCT,
        entityId: 42,
        viewedAt: new Date('2024-01-01T00:00:00.000Z'),
      };

      const mockViewSecondTime = {
        id: 1,
        userId: 5,
        entityType: EntityType.PRODUCT,
        entityId: 42,
        viewedAt: new Date('2024-01-02T00:00:00.000Z'),
      };

      const mockRequest = createMockRequest({ sub: 5 });
      
      // First view
      mockViewService.recordView.mockResolvedValue(mockViewFirstTime);
      const firstResult = await controller.recordView(mockRequest, recordViewDto);
      expect(firstResult.viewedAt).toEqual(new Date('2024-01-01T00:00:00.000Z'));

      // Second view - timestamp should be updated
      mockViewService.recordView.mockResolvedValue(mockViewSecondTime);
      const secondResult = await controller.recordView(mockRequest, recordViewDto);
      expect(secondResult.viewedAt).toEqual(new Date('2024-01-02T00:00:00.000Z'));
      expect(secondResult.id).toBe(firstResult.id); // Same record ID
    });
  });

  describe('GET /views/list', () => {
    it('should return all views for authenticated user', async () => {
      const mockViews = [
        {
          id: 1,
          userId: 5,
          entityType: EntityType.PRODUCT,
          entityId: 42,
          viewedAt: new Date('2024-01-01T00:00:00.000Z'),
        },
        {
          id: 2,
          userId: 5,
          entityType: EntityType.STORE,
          entityId: 1,
          viewedAt: new Date('2024-01-02T00:00:00.000Z'),
        },
      ];

      const mockRequest = createMockRequest({ sub: 5 });
      const queryDto: ListViewsDto = {};
      mockViewService.getUserViews.mockResolvedValue(mockViews);

      const result = await controller.listMyViews(mockRequest, queryDto);

      expect(mockViewService.getUserViews).toHaveBeenCalledWith(
        5,
        undefined,
        undefined,
        undefined,
      );
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
    });

    it('should filter views by entity type', async () => {
      const mockProductViews = [
        {
          id: 1,
          userId: 5,
          entityType: EntityType.PRODUCT,
          entityId: 42,
          viewedAt: new Date('2024-01-01T00:00:00.000Z'),
        },
        {
          id: 3,
          userId: 5,
          entityType: EntityType.PRODUCT,
          entityId: 99,
          viewedAt: new Date('2024-01-03T00:00:00.000Z'),
        },
      ];

      const mockRequest = createMockRequest({ sub: 5 });
      const queryDto: ListViewsDto = { entityType: EntityType.PRODUCT };
      mockViewService.getUserViews.mockResolvedValue(mockProductViews);

      const result = await controller.listMyViews(mockRequest, queryDto);

      expect(mockViewService.getUserViews).toHaveBeenCalledWith(
        5,
        EntityType.PRODUCT,
        undefined,
        undefined,
      );
      expect(result).toHaveLength(2);
      expect(result.every((view) => view.entityType === EntityType.PRODUCT)).toBe(true);
    });

    it('should support pagination with skip and take', async () => {
      const mockViews = [
        {
          id: 3,
          userId: 5,
          entityType: EntityType.PRODUCT,
          entityId: 10,
          viewedAt: new Date('2024-01-03T00:00:00.000Z'),
        },
      ];

      const mockRequest = createMockRequest({ sub: 5 });
      const queryDto: ListViewsDto = { skip: 10, take: 20 };
      mockViewService.getUserViews.mockResolvedValue(mockViews);

      const result = await controller.listMyViews(mockRequest, queryDto);

      expect(mockViewService.getUserViews).toHaveBeenCalledWith(
        5,
        undefined,
        10,
        20,
      );
      expect(result).toEqual(mockViews);
    });

    it('should return empty array when user has no views', async () => {
      const mockRequest = createMockRequest({ sub: 5 });
      const queryDto: ListViewsDto = {};
      mockViewService.getUserViews.mockResolvedValue([]);

      const result = await controller.listMyViews(mockRequest, queryDto);

      expect(result).toEqual([]);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('GET /views/:entityType/:entityId/count', () => {
    it('should return view count for a product', async () => {
      mockViewService.getEntityViewCount.mockResolvedValue(150);

      const result = await controller.getEntityViewCount(
        EntityType.PRODUCT,
        '42',
      );

      expect(mockViewService.getEntityViewCount).toHaveBeenCalledWith(
        EntityType.PRODUCT,
        42,
      );
      expect(result).toEqual({
        entityType: EntityType.PRODUCT,
        entityId: 42,
        viewCount: 150,
      });
    });

    it('should return view count for a store', async () => {
      mockViewService.getEntityViewCount.mockResolvedValue(75);

      const result = await controller.getEntityViewCount(
        EntityType.STORE,
        '1',
      );

      expect(mockViewService.getEntityViewCount).toHaveBeenCalledWith(
        EntityType.STORE,
        1,
      );
      expect(result.viewCount).toBe(75);
    });

    it('should return view count for a promotion', async () => {
      mockViewService.getEntityViewCount.mockResolvedValue(200);

      const result = await controller.getEntityViewCount(
        EntityType.PROMOTION,
        '7',
      );

      expect(mockViewService.getEntityViewCount).toHaveBeenCalledWith(
        EntityType.PROMOTION,
        7,
      );
      expect(result.viewCount).toBe(200);
    });

    it('should return 0 when entity has no views', async () => {
      mockViewService.getEntityViewCount.mockResolvedValue(0);

      const result = await controller.getEntityViewCount(
        EntityType.PRODUCT,
        '999',
      );

      expect(result.viewCount).toBe(0);
    });

    it('should parse string entityId to number', async () => {
      mockViewService.getEntityViewCount.mockResolvedValue(10);

      await controller.getEntityViewCount(EntityType.PRODUCT, '12345');

      expect(mockViewService.getEntityViewCount).toHaveBeenCalledWith(
        EntityType.PRODUCT,
        12345,
      );
    });
  });
});
