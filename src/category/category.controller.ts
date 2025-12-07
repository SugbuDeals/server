import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiBadRequestResponse,
  ApiCreatedResponse,
} from '@nestjs/swagger';
import { CategoryService } from './category.service';
import { CreateCategoryDTO } from './dto/createCategory.dto';
import { UpdateCategoryDTO } from './dto/updateCategory.dto';
import { CategoryResponseDto } from './dto/category-response.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { RolesGuard } from 'src/auth/roles.guard';
import { UserRole } from 'generated/prisma';

/**
 * Category Controller
 * 
 * Handles HTTP requests for category management operations.
 * Provides endpoints for creating, reading, updating, and deleting product categories.
 * 
 * Access Control:
 * - All authenticated users can view categories
 * - Only admins can create, update, or delete categories
 */
@ApiTags('Categories')
@Controller('category')
export class CategoryController {
  constructor(private categoryService: CategoryService) {}

  /**
   * Retrieves a list of all categories.
   * 
   * @returns Array of category objects
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ 
    summary: 'List categories',
    description: 'Retrieves a list of all product categories. Available to all authenticated users.'
  })
  @ApiOkResponse({ 
    description: 'Returns list of categories',
    type: [CategoryResponseDto]
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  async findManyCategories() {
    return this.categoryService.categories({});
  }

  /**
   * Retrieves a single category by its ID.
   * 
   * @param id - Category ID
   * @returns Category object or null if not found
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ 
    summary: 'Get category by id',
    description: 'Retrieves detailed information about a specific category by its ID.'
  })
  @ApiParam({ 
    name: 'id', 
    type: Number,
    description: 'Category ID',
    example: 1
  })
  @ApiOkResponse({ 
    description: 'Returns category details',
    type: CategoryResponseDto
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  async findUniqueCategory(@Param('id') id: string) {
    return this.categoryService.category({ id: Number(id) });
  }

  /**
   * Creates a new category (Admin only).
   * 
   * @param createCategoryDTO - Category creation data
   * @returns Created category object
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ 
    summary: 'Create a category',
    description: 'Creates a new product category. Restricted to admins only.'
  })
  @ApiBody({ type: CreateCategoryDTO })
  @ApiCreatedResponse({ 
    description: 'Category created successfully',
    type: CategoryResponseDto
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({ 
    description: 'Forbidden - Only admins can create categories',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 403 }
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
  @Roles(UserRole.ADMIN)
  async createCategory(@Body() createCategoryDTO: CreateCategoryDTO) {
    return this.categoryService.createCategory(createCategoryDTO);
  }

  /**
   * Updates an existing category (Admin only).
   * 
   * @param id - Category ID to update
   * @param updateCategoryDTO - Category update data
   * @returns Updated category object
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ 
    summary: 'Update a category',
    description: 'Updates category information. Restricted to admins only.'
  })
  @ApiParam({ 
    name: 'id', 
    type: Number,
    description: 'Category ID to update',
    example: 1
  })
  @ApiBody({ type: UpdateCategoryDTO })
  @ApiOkResponse({ 
    description: 'Category updated successfully',
    type: CategoryResponseDto
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({ 
    description: 'Forbidden - Only admins can update categories',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 403 }
      }
    }
  })
  @ApiBadRequestResponse({ 
    description: 'Invalid category ID or validation error',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 }
      }
    }
  })
  @Roles(UserRole.ADMIN)
  async updateCategory(
    @Param('id') id: string,
    @Body() updateCategoryDTO: UpdateCategoryDTO,
  ) {
    return this.categoryService.updateCategory({
      where: { id: Number(id) },
      data: updateCategoryDTO,
    });
  }

  /**
   * Deletes a category (Admin only).
   * 
   * When a category is deleted, products associated with it will have
   * their categoryId set to null (cascade behavior).
   * 
   * @param id - Category ID to delete
   * @returns Deleted category object
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ 
    summary: 'Delete a category',
    description: 'Permanently deletes a category. Restricted to admins only. Products associated with this category will have their categoryId set to null.'
  })
  @ApiParam({ 
    name: 'id', 
    type: Number,
    description: 'Category ID to delete',
    example: 1
  })
  @ApiOkResponse({ 
    description: 'Category deleted successfully',
    type: CategoryResponseDto
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing JWT token' })
  @ApiForbiddenResponse({ 
    description: 'Forbidden - Only admins can delete categories',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 403 }
      }
    }
  })
  @Roles(UserRole.ADMIN)
  async deleteCategory(@Param('id') id: string) {
    return this.categoryService.deleteCategory({ id: Number(id) });
  }
}
