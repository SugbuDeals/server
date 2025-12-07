import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma, Category } from 'generated/prisma';

/**
 * Category Service
 * 
 * Provides category data access and manipulation operations.
 * Handles CRUD operations for product categories.
 * 
 * Categories are used to organize products and can be assigned to products
 * when creating or updating them. Categories have a many-to-one relationship
 * with products (many products can belong to one category).
 */
@Injectable()
export class CategoryService {
  constructor(private prisma: PrismaService) {}

  /**
   * Retrieves multiple categories based on provided criteria.
   * 
   * @param params - Query parameters for finding categories
   * @param params.skip - Number of records to skip for pagination
   * @param params.take - Number of records to return
   * @param params.cursor - Cursor for cursor-based pagination
   * @param params.where - Filter conditions
   * @param params.orderBy - Sorting criteria
   * @returns Promise resolving to an array of categories
   */
  async categories(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.CategoryWhereUniqueInput;
    where?: Prisma.CategoryWhereInput;
    orderBy?: Prisma.CategoryOrderByWithRelationInput;
  }): Promise<Category[]> {
    const { skip, take, cursor, where, orderBy } = params;
    return this.prisma.category.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
    });
  }

  /**
   * Retrieves a single category by its unique identifier.
   * 
   * @param categoryWhereUniqueInput - Unique identifier criteria (id)
   * @returns Promise resolving to the found category or null if not found
   */
  async category(categoryWhereUniqueInput: Prisma.CategoryWhereUniqueInput): Promise<Category | null> {
    return this.prisma.category.findUnique({
      where: categoryWhereUniqueInput,
    });
  }

  /**
   * Creates a new category in the database.
   * 
   * @param data - The data for creating the category
   * @returns Promise resolving to the newly created category
   * @throws {PrismaClientKnownRequestError} If category creation fails
   */
  async createCategory(data: Prisma.CategoryCreateInput): Promise<Category> {
    return this.prisma.category.create({
      data,
    });
  }

  /**
   * Updates an existing category in the database.
   * 
   * @param params - Update parameters
   * @param params.where - Unique identifier of the category to update
   * @param params.data - The data to update the category with
   * @returns Promise resolving to the updated category
   * @throws {PrismaClientKnownRequestError} If the category is not found
   */
  async updateCategory(params: { where: Prisma.CategoryWhereUniqueInput; data: Prisma.CategoryUpdateInput; }): Promise<Category> {
    const { where, data } = params;
    return this.prisma.category.update({
      data,
      where,
    });
  }

  /**
   * Deletes a category from the database.
   * 
   * Note: If products are associated with this category, their categoryId
   * will be set to null (due to onDelete: SetNull in Prisma schema).
   * 
   * @param where - Unique identifier of the category to delete
   * @returns Promise resolving to the deleted category
   * @throws {PrismaClientKnownRequestError} If the category is not found
   */
  async deleteCategory(where: Prisma.CategoryWhereUniqueInput): Promise<Category> {
    return this.prisma.category.delete({
      where,
    });
  }
}


