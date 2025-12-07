import { Test, TestingModule } from '@nestjs/testing';
import { CategoryController } from './category.controller';
import { CategoryService } from './category.service';
import { CreateCategoryDTO } from './dto/createCategory.dto';
import { UpdateCategoryDTO } from './dto/updateCategory.dto';

describe('CategoryController', () => {
  let controller: CategoryController;
  let service: CategoryService;

  const mockCategoryService = {
    categories: jest.fn(),
    category: jest.fn(),
    createCategory: jest.fn(),
    updateCategory: jest.fn(),
    deleteCategory: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoryController],
      providers: [
        {
          provide: CategoryService,
          useValue: mockCategoryService,
        },
      ],
    }).compile();

    controller = module.get<CategoryController>(CategoryController);
    service = module.get<CategoryService>(CategoryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /category', () => {
    it('should return array of CategoryResponseDto matching Swagger schema', async () => {
      const mockCategories = [
        { id: 1, name: 'Electronics', description: 'Electronic items' },
        { id: 2, name: 'Clothing', description: 'Clothing items' },
      ];

      mockCategoryService.categories.mockResolvedValue(mockCategories);

      const result = await controller.findManyCategories();

      expect(mockCategoryService.categories).toHaveBeenCalledWith({});
      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual(mockCategories);
    });
  });

  describe('GET /category/:id', () => {
    it('should return CategoryResponseDto matching Swagger schema', async () => {
      const mockCategory = {
        id: 1,
        name: 'Electronics',
        description: 'Electronic items',
      };

      mockCategoryService.category.mockResolvedValue(mockCategory);

      const result = await controller.findUniqueCategory('1');

      expect(mockCategoryService.category).toHaveBeenCalledWith({ id: 1 });
      expect(result).toEqual(mockCategory);
    });

    it('should return null when category is not found', async () => {
      mockCategoryService.category.mockResolvedValue(null);

      const result = await controller.findUniqueCategory('999');

      expect(result).toBeNull();
    });
  });

  describe('POST /category', () => {
    it('should return CategoryResponseDto matching Swagger schema on successful creation', async () => {
      const createDto: CreateCategoryDTO = {
        name: 'New Category',
      };

      const createdCategory = {
        id: 1,
        name: 'New Category',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockCategoryService.createCategory.mockResolvedValue(createdCategory);

      const result = await controller.createCategory(createDto);

      expect(mockCategoryService.createCategory).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(createdCategory);
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('name', createDto.name);
    });
  });

  describe('PATCH /category/:id', () => {
    it('should return CategoryResponseDto matching Swagger schema on successful update', async () => {
      const updateDto: UpdateCategoryDTO = {
        name: 'Updated Category',
      };

      const updatedCategory = {
        id: 1,
        name: 'Updated Category',
        description: 'Original description',
      };

      mockCategoryService.updateCategory.mockResolvedValue(updatedCategory);

      const result = await controller.updateCategory('1', updateDto);

      expect(mockCategoryService.updateCategory).toHaveBeenCalledWith({
        where: { id: 1 },
        data: updateDto,
      });
      expect(result).toEqual(updatedCategory);
      expect(result.name).toBe(updateDto.name);
    });
  });

  describe('DELETE /category/:id', () => {
    it('should return CategoryResponseDto matching Swagger schema on successful deletion', async () => {
      const deletedCategory = {
        id: 1,
        name: 'Deleted Category',
        description: 'Category to be deleted',
      };

      mockCategoryService.deleteCategory.mockResolvedValue(deletedCategory);

      const result = await controller.deleteCategory('1');

      expect(mockCategoryService.deleteCategory).toHaveBeenCalledWith({ id: 1 });
      expect(result).toEqual(deletedCategory);
    });
  });
});

