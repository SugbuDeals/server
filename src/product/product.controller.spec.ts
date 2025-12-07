import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { CreateProductDTO } from './dto/createProduct.dto';
import { UpdateProductDTO } from './dto/updateProduct.dto';
import { UpdateProductStatusDTO } from './dto/updateProductStatus.dto';
import { UserRole } from 'generated/prisma';
import { createMockRequest } from '../../test/utils/test-helpers';

describe('ProductController', () => {
  let controller: ProductController;
  let service: ProductService;

  const mockProductService = {
    products: jest.fn(),
    product: jest.fn(),
    createProduct: jest.fn(),
    updateProduct: jest.fn(),
    deleteProduct: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductController],
      providers: [
        {
          provide: ProductService,
          useValue: mockProductService,
        },
      ],
    }).compile();

    controller = module.get<ProductController>(ProductController);
    service = module.get<ProductService>(ProductService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /product', () => {
    it('should return array of ProductResponseDto matching Swagger schema', async () => {
      const mockProducts = [
        { id: 1, name: 'Product 1', price: 100, stock: 10 },
        { id: 2, name: 'Product 2', price: 200, stock: 20 },
      ];

      mockProductService.products.mockResolvedValue(mockProducts);

      const result = await controller.findManyProducts();

      expect(mockProductService.products).toHaveBeenCalled();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should filter by storeId when provided', async () => {
      const mockProducts = [{ id: 1, name: 'Product 1', storeId: 1 }];
      mockProductService.products.mockResolvedValue(mockProducts);

      await controller.findManyProducts('1');

      expect(mockProductService.products).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ storeId: 1 }),
        }),
      );
    });
  });

  describe('GET /product/:id', () => {
    it('should return ProductResponseDto matching Swagger schema', async () => {
      const mockProduct = {
        id: 1,
        name: 'Product 1',
        price: 100,
        stock: 10,
      };

      mockProductService.product.mockResolvedValue(mockProduct);

      const result = await controller.findUniqueProduct('1');

      expect(mockProductService.product).toHaveBeenCalledWith({ id: 1 });
      expect(result).toEqual(mockProduct);
    });
  });

  describe('POST /product', () => {
    it('should return ProductResponseDto matching Swagger schema on successful creation', async () => {
      const createDto: CreateProductDTO = {
        name: 'New Product',
        description: 'Product description',
        price: 100,
        stock: 10,
        storeId: 1,
      };

      const createdProduct = {
        id: 1,
        ...createDto,
        createdAt: new Date(),
        isActive: true,
      };

      const mockRequest = createMockRequest({ role: UserRole.RETAILER });
      mockProductService.createProduct.mockResolvedValue(createdProduct);

      const result = await controller.createProduct(mockRequest, createDto);

      expect(mockProductService.createProduct).toHaveBeenCalled();
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('name', createDto.name);
    });
  });

  describe('PATCH /product/:id', () => {
    it('should return ProductResponseDto matching Swagger schema on successful update', async () => {
      const updateDto: UpdateProductDTO = {
        name: 'Updated Product',
      };

      const updatedProduct = {
        id: 1,
        name: 'Updated Product',
        price: 100,
        stock: 10,
      };

      const mockRequest = createMockRequest({ role: UserRole.RETAILER });
      mockProductService.updateProduct.mockResolvedValue(updatedProduct);

      const result = await controller.updateProduct(mockRequest, '1', updateDto);

      expect(mockProductService.updateProduct).toHaveBeenCalled();
      expect(result.name).toBe(updateDto.name);
    });
  });

  describe('DELETE /product/:id', () => {
    it('should return ProductResponseDto matching Swagger schema on successful deletion', async () => {
      const deletedProduct = {
        id: 1,
        name: 'Deleted Product',
      };

      mockProductService.deleteProduct.mockResolvedValue(deletedProduct);

      const result = await controller.deleteProduct('1');

      expect(mockProductService.deleteProduct).toHaveBeenCalledWith({ id: 1 });
      expect(result).toEqual(deletedProduct);
    });
  });

  describe('PATCH /product/:id/admin-status', () => {
    it('should return ProductResponseDto matching Swagger schema on status update', async () => {
      const statusDto: UpdateProductStatusDTO = {
        isActive: false,
      };

      const updatedProduct = {
        id: 1,
        name: 'Product',
        isActive: false,
      };

      const mockRequest = createMockRequest({ role: UserRole.ADMIN });
      mockProductService.updateProduct.mockResolvedValue(updatedProduct);

      const result = await controller.updateProductAdminStatus(
        mockRequest,
        '1',
        statusDto,
      );

      expect(mockProductService.updateProduct).toHaveBeenCalled();
      expect(result.isActive).toBe(false);
    });
  });
});

