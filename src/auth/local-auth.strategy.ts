import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from './auth.service';

/**
 * Local Authentication Strategy
 * 
 * Implements Passport local strategy for email/password authentication.
 * Uses email as the username field instead of the default 'username'.
 * 
 * This strategy validates user credentials against the database and returns
 * the user object if authentication succeeds.
 */
@Injectable()
export class LocalAuthStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      usernameField: 'email',
    });
  }

  /**
   * Validates user credentials.
   * 
   * Called automatically by Passport when LocalAuthGuard is used.
   * Validates the email and password against the database.
   * 
   * @param username - The email address (mapped from usernameField)
   * @param password - The plain text password
   * @returns User object if authentication succeeds
   * @throws {UnauthorizedException} If credentials are invalid
   */
  async validate(username: string, password: string): Promise<any> {
    const user = await this.authService.validateUser(username, password);
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}
