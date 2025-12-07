import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Local Authentication Guard
 * 
 * Protects routes by validating email and password credentials.
 * This guard uses Passport's local strategy to authenticate users with credentials
 * provided in the request body.
 * 
 * Usage:
 * Apply this guard to login endpoints:
 * ```typescript
 * @UseGuards(LocalAuthGuard)
 * @Post('login')
 * login(@Body() loginDto: LoginDTO) { ... }
 * ```
 * 
 * The guard expects email and password in the request body and validates them
 * against the database. If valid, the user object is attached to the request.
 */
@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {}
