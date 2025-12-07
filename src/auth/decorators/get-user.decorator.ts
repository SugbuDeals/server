import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * GetUser Parameter Decorator
 * 
 * Extracts the authenticated user from the request object.
 * The user object is attached to the request by JwtAuthGuard after successful authentication.
 * 
 * Usage:
 * ```typescript
 * @Get('profile')
 * getProfile(@GetUser() user: PayloadDTO) {
 *   // user contains: { sub: number, email: string, role: UserRole }
 *   return user;
 * }
 * 
 * // Or get a specific property:
 * @Get('profile')
 * getProfile(@GetUser('email') email: string) {
 *   return { email };
 * }
 * ```
 * 
 * @param data - Optional property name to extract from user object
 * @param ctx - Execution context containing the request
 * @returns The user object or a specific property if data is provided
 */
export const GetUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    return data ? user?.[data] : user;
  },
);
