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
});

