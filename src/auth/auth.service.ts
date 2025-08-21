import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from 'generated/prisma';
import { UsersService } from 'src/users/users.service';
import * as bcrypt from 'bcrypt';

/**
 * Authentication service that handles user validation and JWT token generation
 */
@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  /**
   * Validates a user's credentials
   * @param email The user's email address
   * @param password The user's password
   * @returns The user object without the password if validation is successful, null otherwise
   */
  async validateUser(
    email: string,
    password: string,
  ): Promise<Omit<User, 'password'> | null> {
    const user = await this.usersService.user({ email: email });
    if (!user) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  /**
   * Generates a JWT token for an authenticated user
   * @param user The authenticated user object
   * @returns An object containing the signed JWT access token
   */
  login(user: { id: number; email: string }) {
    const payload = { email: user.email, sub: user.id };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
