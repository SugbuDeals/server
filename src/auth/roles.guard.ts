import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './decorators/roles.decorator';
import { PayloadDTO } from './dto/payload.dto';
import { UserRole } from 'generated/prisma';

/**
 * Roles Guard
 * 
 * Enforces role-based access control (RBAC) on routes.
 * Checks if the authenticated user has one of the required roles specified
 * by the @Roles() decorator.
 * 
 * Usage:
 * Apply this guard along with JwtAuthGuard and use @Roles() decorator:
 * ```typescript
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Roles(UserRole.ADMIN, UserRole.RETAILER)
 * @Post('stores')
 * createStore() { ... }
 * ```
 * 
 * If no roles are specified, all authenticated users are allowed.
 * If roles are specified, only users with matching roles can access the route.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  /**
   * Determines if the current request can proceed based on user roles.
   * 
   * Checks the required roles from the @Roles() decorator and compares them
   * with the authenticated user's role.
   * 
   * @param context - The execution context containing request/response objects
   * @returns true if user has required role, false otherwise
   * @throws {UnauthorizedException} If user is not authenticated
   * @throws {ForbiddenException} If user doesn't have required role
   */
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles =
      this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);

    // If no roles are required, allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<
      Request & { user?: Omit<PayloadDTO, 'password'> }
    >();

    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }

    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException('You do not have permission to access this resource');
    }

    return true;
  }
}


