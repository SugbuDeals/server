import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from './auth.service';
import { PayloadDTO } from './dto/payload.dto';

/**
 * JWT Authentication Strategy
 * 
 * Implements Passport JWT strategy for validating JWT tokens.
 * Extracts tokens from the Authorization header as Bearer tokens and validates
 * them using the JWT_SECRET from environment variables.
 * 
 * The strategy extracts the JWT payload and attaches user information to the request.
 */
@Injectable()
export class JwtAuthStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET as string,
    });
  }

  /**
   * Validates the JWT payload and returns user information.
   * 
   * This method is called automatically by Passport after JWT verification succeeds.
   * The returned object is attached to the request as `request.user`.
   * 
   * @param payload - The decoded JWT payload containing user information
   * @returns User object with sub (user ID), email, and role
   */
  validate(payload: PayloadDTO) {
    return {
      sub: payload.sub,
      email: payload.email,
      role: payload.role
    };
  }
}
