import { Test, TestingModule } from '@nestjs/testing';
import { PromotionController } from './promotion.controller';
import { PromotionService } from './promotion.service';

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
        type: 'percentage',
        description: '25% off',
        discount: 25,
        productIds: [1, 2, 3],
      };

      const mockPromotion = {
        id: 1,
        title: 'Summer Sale',
        type: 'percentage',
        description: '25% off',
        startsAt: new Date(),
        endsAt: null,
        active: true,
        discount: 25,
        promotionProducts: [
          {
            id: 1,
            promotionId: 1,
            productId: 1,
            createdAt: new Date(),
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
            product: {
              id: 2,
              name: 'Product 2',
              price: 200,
              storeId: 1,
            },
          },
        ],
      };

      mockPromotionService.create.mockResolvedValue(mockPromotion);

      const result = await controller.create(createPromotionDto);

      expect(result).toEqual(mockPromotion);
      expect(mockPromotionService.create).toHaveBeenCalledWith(
        createPromotionDto,
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
});
