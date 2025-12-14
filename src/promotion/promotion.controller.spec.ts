import { Test, TestingModule } from '@nestjs/testing';
import { PromotionController } from './promotion.controller';
import { PromotionService } from './promotion.service';
import { DealType } from 'generated/prisma';

describe('PromotionController', () => {
  let controller: PromotionController;
  let service: PromotionService;

  const mockPromotionService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findActive: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    addProductsToPromotion: jest.fn(),
    getPromotionsWithProductsAndStores: jest.fn(),
    getPromotionsByStore: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PromotionController],
      providers: [
        {
          provide: PromotionService,
          useValue: mockPromotionService,
        },
      ],
    }).compile();

    controller = module.get<PromotionController>(PromotionController);
    service = module.get<PromotionService>(PromotionService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a promotion with multiple products', async () => {
      const createPromotionDto = {
        title: 'Summer Sale',
        dealType: DealType.PERCENTAGE_DISCOUNT,
        description: '25% off',
        percentageOff: 25,
        productIds: [1, 2, 3],
      };

      const mockPromotion = {
        id: 1,
        title: 'Summer Sale',
        dealType: DealType.PERCENTAGE_DISCOUNT,
        description: '25% off',
        startsAt: new Date(),
        endsAt: null,
        active: true,
        percentageOff: 25,
        fixedAmountOff: null,
        buyQuantity: null,
        getQuantity: null,
        bundlePrice: null,
        minQuantity: null,
        quantityDiscount: null,
        promotionProducts: [
          {
            id: 1,
            promotionId: 1,
            productId: 1,
            createdAt: new Date(),
            productRole: 'default',
            product: {
              id: 1,
              name: 'Product 1',
              price: 100,
              storeId: 1,
            },
          },
          {
            id: 2,
            promotionId: 1,
            productId: 2,
            createdAt: new Date(),
            productRole: 'default',
            product: {
              id: 2,
              name: 'Product 2',
              price: 200,
              storeId: 1,
            },
          },
        ],
      };

      const mockRequest = {
        user: {
          sub: 1,
          email: 'test@example.com',
          name: 'Test User',
          role: 'RETAILER',
        },
      };

      mockPromotionService.create.mockResolvedValue(mockPromotion);

      const result = await controller.create(mockRequest as any, createPromotionDto as any);

      expect(result).toEqual(mockPromotion);
      expect(mockPromotionService.create).toHaveBeenCalledWith(
        createPromotionDto,
        1,
      );
    });
  });

  describe('findAll', () => {
    it('should return all promotions', async () => {
      const mockPromotions = [
        {
          id: 1,
          title: 'Promo 1',
          promotionProducts: [],
        },
        {
          id: 2,
          title: 'Promo 2',
          promotionProducts: [],
        },
      ];

      mockPromotionService.findAll.mockResolvedValue(mockPromotions);

      const result = await controller.findAll();

      expect(result).toEqual(mockPromotions);
      expect(mockPromotionService.findAll).toHaveBeenCalled();
    });
  });

  describe('findActive', () => {
    it('should return only active promotions', async () => {
      const mockActivePromotions = [
        {
          id: 1,
          title: 'Active Promo',
          active: true,
          promotionProducts: [],
        },
      ];

      mockPromotionService.findActive.mockResolvedValue(mockActivePromotions);

      const result = await controller.findActive();

      expect(result).toEqual(mockActivePromotions);
      expect(mockPromotionService.findActive).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a single promotion by id', async () => {
      const mockPromotion = {
        id: 1,
        title: 'Test Promo',
        promotionProducts: [],
      };

      mockPromotionService.findOne.mockResolvedValue(mockPromotion);

      const result = await controller.findOne(1);

      expect(result).toEqual(mockPromotion);
      expect(mockPromotionService.findOne).toHaveBeenCalledWith(1);
    });
  });

  describe('update', () => {
    it('should update a promotion', async () => {
      const updatePromotionDto = {
        title: 'Updated Promo',
        discount: 30,
      };

      const mockUpdatedPromotion = {
        id: 1,
        title: 'Updated Promo',
        discount: 30,
        promotionProducts: [],
      };

      mockPromotionService.update.mockResolvedValue(mockUpdatedPromotion);

      const result = await controller.update(1, updatePromotionDto);

      expect(result).toEqual(mockUpdatedPromotion);
      expect(mockPromotionService.update).toHaveBeenCalledWith(
        1,
        updatePromotionDto,
      );
    });
  });

  describe('remove', () => {
    it('should delete a promotion', async () => {
      const mockDeletedPromotion = {
        id: 1,
        title: 'Deleted Promo',
      };

      mockPromotionService.remove.mockResolvedValue(mockDeletedPromotion);

      const result = await controller.remove(1);

      expect(result).toEqual(mockDeletedPromotion);
      expect(mockPromotionService.remove).toHaveBeenCalledWith(1);
    });
  });

  describe('addProducts', () => {
    it('should add products to an existing promotion', async () => {
      const mockRequest: any = {
        user: {
          sub: 1,
          email: 'retailer@example.com',
          role: 'RETAILER',
        },
      };

      const addProductsDto = {
        productIds: [4, 5, 6],
      };

      const mockUpdatedPromotion = {
        id: 1,
        title: 'Test Promo',
        promotionProducts: [
          { id: 1, promotionId: 1, productId: 1 },
          { id: 2, promotionId: 1, productId: 4 },
          { id: 3, promotionId: 1, productId: 5 },
          { id: 4, promotionId: 1, productId: 6 },
        ],
      };

      mockPromotionService.addProductsToPromotion.mockResolvedValue(
        mockUpdatedPromotion,
      );

      const result = await controller.addProducts(
        mockRequest,
        1,
        addProductsDto,
      );

      expect(result).toEqual(mockUpdatedPromotion);
      expect(mockPromotionService.addProductsToPromotion).toHaveBeenCalledWith(
        1,
        1,
        addProductsDto,
      );
    });
  });

  describe('GET /promotions/with-details', () => {
    it('should return paginated promotions with products and stores', async () => {
      const mockResult = {
        data: [
          {
            id: 1,
            title: 'Black Friday Sale',
            dealType: DealType.PERCENTAGE_DISCOUNT,
            percentageOff: 20,
            products: [
              {
                id: 1,
                name: 'iPhone 15',
                price: '999.99',
                store: { id: 1, name: 'Electronics Store' },
              },
            ],
          },
        ],
        pagination: { skip: 0, take: 20, total: 15 },
      };

      mockPromotionService.getPromotionsWithProductsAndStores.mockResolvedValue(
        mockResult,
      );

      const result = await controller.getPromotionsWithDetails('true', '0', '20');

      expect(
        mockPromotionService.getPromotionsWithProductsAndStores,
      ).toHaveBeenCalledWith({
        pagination: { skip: 0, take: 20 },
        onlyActive: true,
      });
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('pagination');
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('should throw BadRequestException for invalid skip', async () => {
      await expect(
        controller.getPromotionsWithDetails('true', '-1', '20'),
      ).rejects.toThrow('Invalid skip parameter');
    });

    it('should throw BadRequestException for invalid take', async () => {
      await expect(
        controller.getPromotionsWithDetails('true', '0', '200'),
      ).rejects.toThrow('Invalid take parameter');
    });
  });

  describe('GET /promotions/by-store/:storeId', () => {
    it('should return promotions for a specific store', async () => {
      const mockPromotions = [
        {
          id: 1,
          title: 'Store Sale',
          dealType: DealType.PERCENTAGE_DISCOUNT,
          percentageOff: 15,
          products: [
            {
              id: 1,
              name: 'Product 1',
              store: { id: 1, name: 'Store 1' },
            },
          ],
        },
      ];

      mockPromotionService.getPromotionsByStore.mockResolvedValue(mockPromotions);

      const result = await controller.getPromotionsByStore(1, 'true');

      expect(mockPromotionService.getPromotionsByStore).toHaveBeenCalledWith(1, true);
      expect(Array.isArray(result)).toBe(true);
      expect(result[0]).toHaveProperty('products');
    });

    it('should default onlyActive to true when not provided', async () => {
      const mockPromotions: any[] = [];
      mockPromotionService.getPromotionsByStore.mockResolvedValue(mockPromotions);

      await controller.getPromotionsByStore(1, undefined);

      expect(mockPromotionService.getPromotionsByStore).toHaveBeenCalledWith(1, true);
    });

    it('should use onlyActive as false when explicitly set', async () => {
      const mockPromotions: any[] = [];
      mockPromotionService.getPromotionsByStore.mockResolvedValue(mockPromotions);

      await controller.getPromotionsByStore(1, 'false');

      expect(mockPromotionService.getPromotionsByStore).toHaveBeenCalledWith(1, false);
    });
  });
});
