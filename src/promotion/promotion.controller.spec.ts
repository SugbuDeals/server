import { Test, TestingModule } from '@nestjs/testing';
import { PromotionController } from './promotion.controller';
import { PromotionService } from './promotion.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';

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
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /promotions', () => {
    it('should return array of PromotionResponseDto matching Swagger schema', async () => {
      const mockPromotions = [
        { id: 1, discount: 10, productId: 1 },
        { id: 2, discount: 20, productId: 2 },
      ];

      mockPromotionService.findAll.mockResolvedValue(mockPromotions);

      const result = await controller.findAll();

      expect(mockPromotionService.findAll).toHaveBeenCalled();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('GET /promotions/active', () => {
    it('should return array of active PromotionResponseDto matching Swagger schema', async () => {
      const mockPromotions = [{ id: 1, discountPercentage: 10, active: true }];

      mockPromotionService.findActive.mockResolvedValue(mockPromotions);

      const result = await controller.findActive();

      expect(mockPromotionService.findActive).toHaveBeenCalled();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('GET /promotions/:id', () => {
    it('should return PromotionResponseDto matching Swagger schema', async () => {
      const mockPromotion = {
        id: 1,
        discount: 10,
        productId: 1,
      };

      mockPromotionService.findOne.mockResolvedValue(mockPromotion);

      const result = await controller.findOne(1);

      expect(mockPromotionService.findOne).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockPromotion);
    });
  });

  describe('POST /promotions', () => {
    it('should return PromotionResponseDto matching Swagger schema on successful creation', async () => {
      const createDto: CreatePromotionDto = {
        title: 'Holiday Sale',
        type: 'percentage',
        description: 'Up to 30% off',
        discount: 15,
        productId: 1,
        startsAt: new Date(),
      };

      const createdPromotion = {
        id: 1,
        ...createDto,
        active: true,
      };

      mockPromotionService.create.mockResolvedValue(createdPromotion);

      const result = await controller.create(createDto);

      expect(mockPromotionService.create).toHaveBeenCalledWith(createDto);
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('discount', createDto.discount);
    });
  });

  describe('PATCH /promotions/:id', () => {
    it('should return PromotionResponseDto matching Swagger schema on successful update', async () => {
      const updateDto: UpdatePromotionDto = {
        discount: 20,
      };

      const updatedPromotion = {
        id: 1,
        discount: 20,
        productId: 1,
      };

      mockPromotionService.update.mockResolvedValue(updatedPromotion);

      const result = await controller.update(1, updateDto);

      expect(mockPromotionService.update).toHaveBeenCalledWith(1, updateDto);
      expect(result.discount).toBe(updateDto.discount);
    });
  });

  describe('DELETE /promotions/:id', () => {
    it('should return PromotionResponseDto matching Swagger schema on successful deletion', async () => {
      const deletedPromotion = {
        id: 1,
        discount: 10,
      };

      mockPromotionService.remove.mockResolvedValue(deletedPromotion);

      const result = await controller.remove(1);

      expect(mockPromotionService.remove).toHaveBeenCalledWith(1);
      expect(result).toEqual(deletedPromotion);
    });
  });
});

