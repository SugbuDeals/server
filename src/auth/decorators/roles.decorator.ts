import { SetMetadata } from '@nestjs/common';
import { UserRole } from 'generated/prisma';

/**
 * Metadata key used to store required roles for route handlers.
 */
export const ROLES_KEY = 'roles';

/**
 * Roles Decorator
 * 
 * Specifies which user roles are required to access a route.
 * Must be used in conjunction with RolesGuard to enforce access control.
 * 
 * Usage:
 * ```typescript
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Roles(UserRole.ADMIN)
 * @Delete(':id')
 * deleteUser() { ... }
 * 
 * // Multiple roles allowed:
 * @Roles(UserRole.ADMIN, UserRole.RETAILER)
 * @Post('stores')
 * createStore() { ... }
 * ```
 * 
 * If no roles are specified, all authenticated users can access the route.
 * 
 * @param roles - One or more UserRole values that are allowed to access the route
 * @returns Method decorator that sets metadata for role-based access control
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);


