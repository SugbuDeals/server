import { Injectable } from '@nestjs/common';
import { Prisma, User } from 'generated/prisma';
import { PrismaService } from 'src/prisma/prisma.service';

/**
 * Users Service
 * 
 * Provides user data access and manipulation operations.
 * Handles CRUD operations for user entities including retrieval,
 * updates, and deletions.
 * 
 * All methods use Prisma's type-safe query builder for database operations.
 */
@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  /**
   * Retrieves a single user by its unique identifier.
   * @param params.where - Unique identifier criteria to find the user
   * @returns Promise resolving to the found user or null if not found
   */
  async user(where: Prisma.UserWhereUniqueInput): Promise<User | null> {
    return this.prisma.user.findUnique({ where });
  }

  /**
   * Retrieves multiple users based on provided criteria.
   * @param params - Query parameters for finding users
   * @param params.skip - Number of records to skip
   * @param params.take - Number of records to take
   * @param params.cursor - Cursor for pagination
   * @param params.where - Filter conditions
   * @param params.orderBy - Sorting criteria
   * @returns Promise resolving to an array of users
   */
  async users(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.UserWhereUniqueInput;
    where?: Prisma.UserWhereInput;
    orderBy?: Prisma.UserOrderByWithRelationInput;
  }): Promise<User[]> {
    const { skip, take, cursor, where, orderBy } = params;
    return this.prisma.user.findMany({ skip, take, cursor, where, orderBy });
  }

  /**
   * Updates an existing user in the database.
   * 
   * @param params - Update parameters
   * @param params.where - Unique identifier criteria to find the user to update
   * @param params.data - The data to update the user with
   * @returns Promise resolving to the updated user
   * @throws {PrismaClientKnownRequestError} If the user is not found or update fails
   * 
   * @example
   * ```typescript
   * const updatedUser = await usersService.update({
   *   where: { id: 1 },
   *   data: { name: 'New Name' }
   * });
   * ```
   */
  async update(params: {
    where: Prisma.UserWhereUniqueInput;
    data: Prisma.UserUpdateInput;
  }): Promise<User> {
    const { where, data } = params;
    return this.prisma.user.update({ where, data });
  }

  /**
   * Deletes a user from the database.
   * 
   * @param params - Delete parameters
   * @param params.where - Unique identifier criteria to find the user to delete
   * @returns Promise resolving to the deleted user, or null if not found
   * @throws {PrismaClientKnownRequestError} If deletion fails
   * 
   * @example
   * ```typescript
   * const deletedUser = await usersService.delete({ where: { id: 1 } });
   * ```
   */
  async delete(params: {
    where: Prisma.UserWhereUniqueInput;
  }): Promise<User | null> {
    const { where } = params;
    return this.prisma.user.delete({ where });
  }
}
