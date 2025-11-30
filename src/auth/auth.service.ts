import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User, UserRole } from 'generated/prisma';
import { UsersService } from 'src/users/users.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotificationService } from 'src/notification/notification.service';
import * as bcrypt from 'bcrypt';

/**
 * Authentication service that handles user validation and JWT token generation
 */
@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService,
    private notificationService: NotificationService,
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

    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Generates a JWT token for an authenticated user
   * @param user The authenticated user object
   * @returns An object containing the signed JWT access token
   */
  async login(user: { id: number; email: string }) {
    // Fetch complete user data to get the role
    const userData = await this.usersService.user({ id: user.id });
    if (!userData) {
      throw new Error('User not found');
    }

    const payload = {
      email: user.email,
      sub: user.id,
      role: userData.role,
    };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  /**
   * Registers a new user
   * @param email The user's email address
   * @param password The user's password
   * @param name The user's name
   * @returns The registered user object with access token
   */
  async register(
    email: string,
    password: string,
    name: string,
    role: UserRole,
  ) {
    // Check if user already exists
    const existingUser = await this.usersService.user({ email });
    if (existingUser) {
      throw new Error('User already exists');
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the user
    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role,
      },
    });

    // Send welcome notification to consumers
    if (role === UserRole.CONSUMER) {
      this.notificationService
        .notifyConsumerWelcome(user.id)
        .catch((err) => {
          console.error('Error creating welcome notification:', err);
        });
    }

    // Generate and return access token
    return this.login(user);
  }
}
