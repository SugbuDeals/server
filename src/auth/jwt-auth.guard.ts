import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

/**
 * JWT Authentication Guard
 * 
 * Protects routes by validating JWT tokens from the Authorization header.
 * This guard uses Passport's JWT strategy to verify tokens and extract user information.
 * 
 * Usage:
 * Apply this guard to controller methods or classes that require authentication:
 * ```typescript
 * @UseGuards(JwtAuthGuard)
 * @Get('protected')
 * getProtectedData() { ... }
 * ```
 * 
 * The guard expects a Bearer token in the Authorization header:
 * `Authorization: Bearer <token>`
 * 
 * If the token is valid, the user object (from JWT payload) is attached to the request.
 * If invalid or missing, an UnauthorizedException is thrown.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  /**
   * Determines if the current request can proceed.
   * 
   * Validates the JWT token from the request headers using the JWT strategy.
   * 
   * @param context - The execution context containing request/response objects
   * @returns true if authentication succeeds, false or throws exception if it fails
   * @throws {UnauthorizedException} If token is missing, invalid, or expired
   */
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    return super.canActivate(context);
  }
}
