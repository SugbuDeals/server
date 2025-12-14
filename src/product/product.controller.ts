import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
  Query,
  Request,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiCreatedResponse,
  ApiResponse,
} from '@nestjs/swagger';
import { ProductService } from './product.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { CreateProductDTO } from './dto/createProduct.dto';
import { UpdateProductDTO } from './dto/updateProduct.dto';
import { UpdateProductStatusDTO } from './dto/updateProductStatus.dto';
import { ProductResponseDto } from './dto/product-response.dto';
import { Prisma, UserRole } from 'generated/prisma';
import { PayloadDTO } from 'src/auth/dto/payload.dto';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { RolesGuard } from 'src/auth/roles.guard';
import { SubscriptionTierGuard } from 'src/subscription/guards/subscription-tier.guard';
import { TierLimit, TierLimitType } from 'src/subscription/decorators/tier-limit.decorator';

/**
 * Product Controller
 * 
 * Handles HTTP requests for product management operations.
 * Provides endpoints for creating, reading, updating, and deleting products.
 * 
 * Access Control:
 * - All authenticated users can view products
 * - Only retailers and admins can create/update/delete products
 * - Admins can enable/disable products
 */
@ApiTags('Products')
@Controller('product')
export class ProductController {
  constructor(private productService: ProductService) {}

  /**
   * Retrieves a list of products with optional filtering.
   * 
   * Supports filtering by store ID and active status.
   * 
   * @param storeId - Optional store ID to filter products by store
   * @param isActive - Optional filter for active/inactive products
   * @returns Array of product objects matching the criteria
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ 
    summary: 'List products with optional filters',
    description: 'Retrieves a list of products. Supports optional filtering by store ID and active status.'
  })
  @ApiQuery({ 
    name: 'storeId', 
    required: false, 
    type: Number,
    description: 'Filter products by store ID',
    example: 1
  })
  @ApiQuery({ 
    name: 'isActive', 
    required: false, 
    type: Boolean,
    description: 'Filter by active status (true/false)',
    example: true
  })
  @ApiOkResponse({ 
    description: 'Returns list of products',
    type: [ProductResponseDto]
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  async findManyProducts(
    @Query('storeId') storeId?: string,
    @Query('isActive') isActive?: string,
  ) {
    const where: any = {};

    if (storeId) {
      where.storeId = Number(storeId);
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    return this.productService.products({ where });
  }

  /**
   * Retrieves products with store and promotion details (paginated).
   * 
   * Provides a comprehensive product listing with optional store and promotion data.
   * Use query parameters to control which data is included and pagination settings.
   * 
   * @param storeId - Filter by store ID
   * @param isActive - Filter by active status
   * @param includeStore - Include store details
   * @param includePromotions - Include promotions
   * @param skip - Pagination skip
   * @param take - Pagination take (max 100)
   * @returns Paginated products with optional nested store and promotions
   */
  @Get('with-details')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'List products with store and promotion details',
    description: 'Retrieves products with optional store and promotion data. Supports pagination and filtering. Use query parameters to control which data is included for optimal performance.'
  })
  @ApiQuery({
    name: 'storeId',
    required: false,
    type: Number,
    description: 'Filter products by store ID',
    example: 1
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    type: Boolean,
    description: 'Filter by active status',
    example: true
  })
  @ApiQuery({
    name: 'includeStore',
    required: false,
    type: Boolean,
    description: 'Include store details in response (default: false)',
    example: true
  })
  @ApiQuery({
    name: 'includePromotions',
    required: false,
    type: Boolean,
    description: 'Include promotions in response (default: false)',
    example: true
  })
  @ApiQuery({
    name: 'skip',
    required: false,
    type: Number,
    description: 'Number of records to skip for pagination (default: 0)',
    example: 0,
    minimum: 0
  })
  @ApiQuery({
    name: 'take',
    required: false,
    type: Number,
    description: 'Number of records to return (default: 10, max: 100)',
    example: 20,
    minimum: 1,
    maximum: 100
  })
  @ApiOkResponse({
    description: 'Returns paginated products with optional store and promotions',
    schema: {
      example: {
        data: [
          {
            id: 1,
            name: 'iPhone 15',
            price: '999.99',
            stock: 50,
            isActive: true,
            store: {
              id: 1,
              name: 'Electronics Store',
              verificationStatus: 'VERIFIED'
            },
            promotions: [
              {
                id: 1,
                title: 'Black Friday Sale',
                dealType: 'PERCENTAGE_DISCOUNT',
                percentageOff: 20,
                active: true
              }
            ]
          }
        ],
        pagination: {
          skip: 0,
          take: 20,
          total: 45
        }
      }
    }
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiBadRequestResponse({
    description: 'Invalid query parameters',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string' }
      }
    }
  })
  async getProductsWithDetails(
    @Query('storeId') storeId?: string,
    @Query('isActive') isActive?: string,
    @Query('includeStore') includeStore?: string,
    @Query('includePromotions') includePromotions?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const where: Prisma.ProductWhereInput = {};

    if (storeId) {
      const storeIdNum = Number(storeId);
      if (isNaN(storeIdNum)) {
        throw new BadRequestException('Invalid storeId');
      }
      where.storeId = storeIdNum;
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const skipNum = skip ? Number(skip) : 0;
    const takeNum = take ? Number(take) : 10;

    if (isNaN(skipNum) || skipNum < 0) {
      throw new BadRequestException('Invalid skip parameter');
    }

    if (isNaN(takeNum) || takeNum < 1 || takeNum > 100) {
      throw new BadRequestException('Invalid take parameter (must be 1-100)');
    }

    return this.productService.getProductsWithStoreAndPromotions({
      where,
      pagination: { skip: skipNum, take: takeNum },
      includeStore: includeStore === 'true',
      includePromotions: includePromotions === 'true',
      onlyActivePromotions: true
    });
  }

  /**
   * Retrieves a single product with full details (store and promotions).
   * 
   * Provides complete product information including optional store details
   * and active promotions. Use query parameters to control which data is included.
   * 
   * NOTE: This route must come before @Get(':id') to prevent NestJS from 
   * matching "full" as the :id parameter.
   * 
   * @param id - Product ID
   * @param includeStore - Include store details
   * @param includePromotions - Include promotions
   * @returns Product with optional store and promotions or null if not found
   */
  @Get(':id/full')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Get product with full details',
    description: 'Retrieves a product with optional store and promotion details. Use query parameters to control which data is included for optimal performance. Perfect for product detail pages.'
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Product ID',
    example: 1
  })
  @ApiQuery({
    name: 'includeStore',
    required: false,
    type: Boolean,
    description: 'Include store details in response (default: false)',
    example: true
  })
  @ApiQuery({
    name: 'includePromotions',
    required: false,
    type: Boolean,
    description: 'Include promotions in response (default: false)',
    example: true
  })
  @ApiOkResponse({
    description: 'Returns product with optional store and promotions',
    schema: {
      example: {
        id: 1,
        name: 'iPhone 15',
        price: '999.99',
        stock: 50,
        isActive: true,
        store: {
          id: 1,
          name: 'Electronics Store',
          verificationStatus: 'VERIFIED',
          isActive: true
        },
        promotions: [
          {
            id: 1,
            title: 'Black Friday Sale',
            dealType: 'PERCENTAGE_DISCOUNT',
            percentageOff: 20,
            active: true
          }
        ]
      }
    }
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiBadRequestResponse({
    description: 'Invalid product ID',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Invalid product id' }
      }
    }
  })
  async getProductWithFullDetails(
    @Param('id') id: string,
    @Query('includeStore') includeStore?: string,
    @Query('includePromotions') includePromotions?: string,
  ) {
    const productId = Number(id);

    if (!productId || Number.isNaN(productId)) {
      throw new BadRequestException('Invalid product id');
    }

    return this.productService.getProductWithStoreAndPromotions(productId, {
      includeStore: includeStore === 'true',
      includePromotions: includePromotions === 'true',
      onlyActivePromotions: true
    });
  }

  /**
   * Retrieves a single product by its ID.
   * 
   * Basic product lookup without additional relations.
   * For product details with store and promotions, use GET /:id/full instead.
   * 
   * @param id - Product ID
   * @returns Product object or null if not found
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ 
    summary: 'Get product by id',
    description: 'Retrieves detailed information about a specific product by its ID.'
  })
  @ApiParam({ 
    name: 'id', 
    type: Number,
    description: 'Product ID',
    example: 1
  })
  @ApiOkResponse({ 
    description: 'Returns product details. May return null if product not found (status 200 with null body).',
    type: ProductResponseDto
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  async findUniqueProduct(@Param('id') id: string) {
    return this.productService.product({ id: Number(id) });
  }

  /**
   * Creates a new product.
   * 
   * After creation, automatically:
   * - Checks for questionable pricing and notifies admins if detected
   * - Notifies users who bookmarked the store about the new product
   * 
   * Subscription Tier Limits (Retailers only):
   * - BASIC: Maximum 10 products per store
   * - PRO: Unlimited products
   * 
   * @param req - Request object containing authenticated user information
   * @param createProductDto - Product creation data
   * @returns Created product object
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard, SubscriptionTierGuard)
  @TierLimit(TierLimitType.RETAILER_PRODUCT_COUNT)
  @ApiBearerAuth('bearer')
  @ApiOperation({ 
    summary: 'Create a product',
    description: 'Creates a new product. Restricted to retailers and admins. Automatically notifies store bookmarks and checks for questionable pricing. TIER LIMITS (Retailers only): BASIC tier allows max 10 products per store, PRO tier allows unlimited products.',
  })
  @ApiBody({ type: CreateProductDTO })
  @ApiCreatedResponse({ 
    description: 'Product created successfully',
    type: ProductResponseDto
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({ 
    description: 'Forbidden - Only retailers and admins can create products, or product limit exceeded',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 403 },
        message: {
          type: 'string',
          examples: [
            'Only retailers and admins can create products',
            'BASIC tier allows a maximum of 10 products. Upgrade to PRO for unlimited products.',
          ],
        },
      }
    }
  })
  @ApiBadRequestResponse({ 
    description: 'Invalid input or validation error',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'array', items: { type: 'string' } }
      }
    }
  })
  @Roles(UserRole.RETAILER, UserRole.ADMIN)
  async createProduct(
    @Request() req: Request & { user: Omit<PayloadDTO, 'password'> },
    @Body() createProductDto: CreateProductDTO,
  ) {
    const { storeId, categoryId, ...body } = createProductDto;

    return this.productService.createProduct({
      ...body,
      store: {
        connect: { id: storeId },
      },
      category:
        typeof categoryId === 'number'
          ? {
              connect: { id: categoryId },
            }
          : undefined,
    });
  }

  /**
   * Updates an existing product.
   * 
   * @param req - Request object containing authenticated user information
   * @param id - Product ID to update
   * @param updateProductDto - Product update data (all fields optional)
   * @returns Updated product object
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ 
    summary: 'Update a product',
    description: 'Updates product information. Restricted to retailers and admins.'
  })
  @ApiParam({ 
    name: 'id', 
    type: Number,
    description: 'Product ID to update',
    example: 1
  })
  @ApiBody({ type: UpdateProductDTO })
  @ApiOkResponse({ 
    description: 'Product updated successfully',
    type: ProductResponseDto
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({ 
    description: 'Forbidden - Only retailers and admins can update products',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 403 }
      }
    }
  })
  @ApiBadRequestResponse({ 
    description: 'Invalid product ID or validation error',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 }
      }
    }
  })
  @Roles(UserRole.RETAILER, UserRole.ADMIN)
  async updateProduct(
    @Request() req: Request & { user: Omit<PayloadDTO, 'password'> },
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDTO,
  ) {
    const { categoryId, ...rest } = updateProductDto;
    const data: Prisma.ProductUpdateInput = {
      ...rest,
    };

    if (typeof categoryId === 'number') {
      data.category = {
        connect: { id: categoryId },
      };
    }

    return this.productService.updateProduct({
      where: { id: Number(id) },
      data,
    });
  }

  /**
   * Enables or disables a product (Admin only).
   * 
   * Allows admins to control product visibility by setting the isActive flag.
   * 
   * @param req - Request object containing authenticated admin user information
   * @param id - Product ID to update
   * @param updateProductStatusDto - Status update data
   * @returns Updated product object
   * @throws {BadRequestException} If product ID is invalid
   * @throws {ForbiddenException} If user is not an admin
   */
  @Patch(':id/admin-status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('bearer')
  @ApiOperation({ 
    summary: 'Admin: enable or disable a product',
    description: 'Updates product active status. Restricted to admins only. Used to enable/disable product visibility.'
  })
  @ApiParam({ 
    name: 'id', 
    type: Number,
    description: 'Product ID to update',
    example: 1
  })
  @ApiBody({ type: UpdateProductStatusDTO })
  @ApiOkResponse({ 
    description: 'Product status updated successfully',
    type: ProductResponseDto
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({ 
    description: 'Forbidden - Only admins can update product status',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 403 }
      }
    }
  })
  @ApiBadRequestResponse({ 
    description: 'Invalid product ID',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Invalid product id' }
      }
    }
  })
  async updateProductAdminStatus(
    @Request() req: Request & { user: Omit<PayloadDTO, 'password'> },
    @Param('id') id: string,
    @Body() updateProductStatusDto: UpdateProductStatusDTO,
  ) {
    const productId = Number(id);

    if (!productId || Number.isNaN(productId)) {
      throw new BadRequestException('Invalid product id');
    }

    const requestingUser = req.user;
    return this.productService.updateProduct({
      where: { id: productId },
      data: {
        isActive: updateProductStatusDto.isActive,
      },
    });
  }

  /**
   * Deletes a product.
   * 
   * This operation is permanent and cannot be undone.
   * 
   * @param id - Product ID to delete
   * @returns Deleted product object
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ 
    summary: 'Delete a product',
    description: 'Permanently deletes a product. Restricted to retailers and admins. This operation cannot be undone.'
  })
  @ApiParam({ 
    name: 'id', 
    type: Number,
    description: 'Product ID to delete',
    example: 1
  })
  @ApiOkResponse({ 
    description: 'Product deleted successfully',
    type: ProductResponseDto
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({ 
    description: 'Forbidden - Only retailers and admins can delete products',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 403 }
      }
    }
  })
  @Roles(UserRole.RETAILER, UserRole.ADMIN)
  async deleteProduct(@Param('id') id: string) {
    return this.productService.deleteProduct({ id: Number(id) });
  }
}
