import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { StoreController } from './store.controller';
import { StoreService } from './store.service';
import { CreateStoreDTO } from './dto/createStore.dto';
import { UpdateStoreDTO } from './dto/updateStore.dto';
import { ManageStoreStatusDTO } from './dto/manageStoreStatus.dto';
import { UserRole } from 'generated/prisma';
import { createMockRequest } from '../../test/utils/test-helpers';

describe('StoreController', () => {
  let controller: StoreController;
  let service: StoreService;

  const mockStoreService = {
    stores: jest.fn(),
    store: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findStoresNearby: jest.fn(),
    getStoreWithProductsAndPromotions: jest.fn(),
    findNearbyWithPromotions: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StoreController],
      providers: [
        {
          provide: StoreService,
          useValue: mockStoreService,
        },
      ],
    }).compile();

    controller = module.get<StoreController>(StoreController);
    service = module.get<StoreService>(StoreService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /store', () => {
    it('should return array of StoreResponseDto matching Swagger schema', async () => {
      const mockStores = [
        { id: 1, name: 'Store 1', description: 'Description 1' },
        { id: 2, name: 'Store 2', description: 'Description 2' },
      ];

      mockStoreService.stores.mockResolvedValue(mockStores);

      const result = await controller.findManyStores();

      expect(mockStoreService.stores).toHaveBeenCalled();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should throw BadRequestException for invalid skip parameter', async () => {
      await expect(controller.findManyStores(undefined, '-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('GET /store/:id', () => {
    it('should return StoreResponseDto matching Swagger schema', async () => {
      const mockStore = {
        id: 1,
        name: 'Store 1',
        description: 'Description',
      };

      mockStoreService.store.mockResolvedValue(mockStore);

      const result = await controller.findUniqueStore('1');

      expect(mockStoreService.store).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result).toEqual(mockStore);
    });
  });

  describe('POST /store', () => {
    it('should return StoreResponseDto matching Swagger schema on successful creation', async () => {
      const createDto: CreateStoreDTO = {
        name: 'New Store',
        description: 'Store description',
        ownerId: 1,
      };

      const createdStore = {
        id: 1,
        ...createDto,
        ownerId: 1,
        createdAt: new Date(),
        isActive: true,
      };

      const mockRequest = createMockRequest({ sub: 1, role: UserRole.RETAILER });
      mockStoreService.create.mockResolvedValue(createdStore);

      const result = await controller.createStore(mockRequest, createDto);

      expect(mockStoreService.create).toHaveBeenCalled();
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('name', createDto.name);
    });
  });

  describe('PATCH /store/:id', () => {
    it('should return StoreResponseDto matching Swagger schema on successful update', async () => {
      const updateDto = {
        name: 'Updated Store',
        description: 'Updated description',
      } as UpdateStoreDTO;

      const existingStore = {
        id: 1,
        name: 'Store',
        description: 'Description',
        ownerId: 1,
      };

      const updatedStore = {
        id: 1,
        name: 'Updated Store',
        description: 'Description',
        ownerId: 1,
      };

      const mockRequest = createMockRequest({ sub: 1, role: UserRole.RETAILER });
      mockStoreService.store.mockResolvedValue(existingStore);
      mockStoreService.update.mockResolvedValue(updatedStore);

      const result = await controller.updateStore(mockRequest, '1', updateDto);

      expect(mockStoreService.update).toHaveBeenCalled();
      expect(result.name).toBe(updateDto.name);
    });
  });

  describe('DELETE /store/:id', () => {
    it('should return StoreResponseDto matching Swagger schema on successful deletion', async () => {
      const existingStore = {
        id: 1,
        name: 'Store',
        ownerId: 1,
      };

      const deletedStore = {
        id: 1,
        name: 'Deleted Store',
        ownerId: 1,
      };

      const mockRequest = createMockRequest({ sub: 1, role: UserRole.RETAILER });
      mockStoreService.store.mockResolvedValue(existingStore);
      mockStoreService.delete.mockResolvedValue(deletedStore);

      const result = await controller.deleteStore(mockRequest, '1');

      expect(mockStoreService.delete).toHaveBeenCalled();
      expect(result).toEqual(deletedStore);
    });
  });

  describe('GET /store/:id/full', () => {
    it('should return store with products and promotions', async () => {
      const mockStoreWithDetails = {
        id: 1,
        name: 'Electronics Store',
        description: 'Best electronics',
        products: [
          {
            id: 1,
            name: 'iPhone 15',
            price: '999.99',
            promotions: [
              {
                id: 1,
                title: 'Black Friday',
                dealType: 'PERCENTAGE_DISCOUNT',
                percentageOff: 20,
                active: true,
              },
            ],
          },
        ],
      };

      mockStoreService.getStoreWithProductsAndPromotions.mockResolvedValue(
        mockStoreWithDetails,
      );

      const result = await controller.getStoreWithProductsAndPromotions(
        '1',
        'true',
        'true',
        'true',
      );

      expect(mockStoreService.getStoreWithProductsAndPromotions).toHaveBeenCalledWith(
        1,
        {
          includeProducts: true,
          includePromotions: true,
          onlyActivePromotions: true,
        },
      );
      expect(result).toHaveProperty('products');
      expect(Array.isArray(result.products)).toBe(true);
    });

    it('should throw BadRequestException for invalid store id', async () => {
      await expect(
        controller.getStoreWithProductsAndPromotions('invalid', 'true', 'true', 'true'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('GET /store/nearby-with-promotions', () => {
    it('should return nearby stores with promotions', async () => {
      const mockResult = {
        stores: [
          {
            id: 1,
            name: 'Electronics Store',
            distance: 2.5,
            latitude: 10.3157,
            longitude: 123.8854,
          },
        ],
        promotions: [
          {
            id: 1,
            title: 'Black Friday',
            dealType: 'PERCENTAGE_DISCOUNT',
            products: [],
          },
        ],
        searchParams: {
          latitude: 10.3157,
          longitude: 123.8854,
          radiusKm: 5,
        },
      };

      mockStoreService.findNearbyWithPromotions.mockResolvedValue(mockResult);

      const result = await controller.findNearbyWithPromotions(
        '10.3157',
        '123.8854',
        '5',
      );

      expect(mockStoreService.findNearbyWithPromotions).toHaveBeenCalledWith(
        10.3157,
        123.8854,
        5,
        {
          onlyVerified: true,
          onlyActive: true,
          onlyActivePromotions: true,
        },
      );
      expect(result).toHaveProperty('stores');
      expect(result).toHaveProperty('promotions');
      expect(result).toHaveProperty('searchParams');
    });

    it('should throw BadRequestException for invalid latitude', async () => {
      await expect(
        controller.findNearbyWithPromotions('invalid', '123.8854', '5'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for out of range latitude', async () => {
      await expect(
        controller.findNearbyWithPromotions('100', '123.8854', '5'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid longitude', async () => {
      await expect(
        controller.findNearbyWithPromotions('10.3157', 'invalid', '5'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for out of range longitude', async () => {
      await expect(
        controller.findNearbyWithPromotions('10.3157', '200', '5'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid radius', async () => {
      await expect(
        controller.findNearbyWithPromotions('10.3157', '123.8854', '-5'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});

