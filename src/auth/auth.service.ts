import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User, UserRole } from 'generated/prisma';
import { UsersService } from 'src/users/users.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotificationService } from 'src/notification/notification.service';
import * as bcrypt from 'bcrypt';

/**
 * Authentication Service
 * 
 * Handles user authentication, registration, and JWT token generation.
 * Provides methods for validating user credentials, creating new user accounts,
 * and generating access tokens for authenticated users.
 * 
 * This service integrates with:
 * - UsersService: For user data retrieval
 * - JwtService: For token generation and signing
 * - NotificationService: For sending welcome notifications to new consumers
 * 
 * Security features:
 * - Password hashing using bcrypt with salt rounds of 10
 * - JWT tokens with user ID, email, and role in payload
 * - Automatic welcome notifications for new consumer accounts
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  /**
   * Validates a user's credentials by checking email and password.
   * 
   * This method retrieves the user by email and compares the provided password
   * with the hashed password stored in the database using bcrypt.
   * 
   * @param email - The user's email address (case-sensitive)
   * @param password - The plain text password to validate
   * @returns The user object without the password field if validation succeeds, null otherwise
   * @throws Does not throw errors, returns null for invalid credentials
   * 
   * @example
   * ```typescript
   * const user = await authService.validateUser('user@example.com', 'password123');
   * if (user) {
   *   // User is authenticated
   * }
   * ```
   */
  async validateUser(
    email: string,
    password: string,
  ): Promise<Omit<User, 'password'> | null> {
    const user = await this.usersService.user({ email: email });
    if (!user) {
      this.logger.warn(`Login attempt failed: User not found - ${email.substring(0, 3)}***`);
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      this.logger.warn(`Login attempt failed: Invalid password - User ID: ${user.id}`);
      return null;
    }

    this.logger.log(`User validated successfully - User ID: ${user.id}, Role: ${user.role}`);
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Generates a JWT access token for an authenticated user.
   * 
   * Creates a signed JWT token containing the user's email, ID (as 'sub'), and role.
   * The token expiration is determined by the JWT configuration in AuthModule.
   * 
   * @param user - The authenticated user object containing at least id and email
   * @returns Promise resolving to an object with the access_token property
   * @throws {Error} If the user cannot be found in the database
   * 
   * @example
   * ```typescript
   * const result = await authService.login({ id: 1, email: 'user@example.com' });
   * // Returns: { access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' }
   * ```
   */
  async login(user: { id: number; email: string }) {
    // Fetch complete user data to get the role
    const userData = await this.usersService.user({ id: user.id });
    if (!userData) {
      this.logger.error(`Login failed: User not found - User ID: ${user.id}`);
      throw new Error('User not found');
    }

    const payload = {
      email: user.email,
      sub: user.id,
      role: userData.role,
    };
    
    this.logger.log(`JWT token generated successfully - User ID: ${user.id}, Role: ${userData.role}`);
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  /**
   * Registers a new user account.
   * 
   * Creates a new user in the database with a hashed password. If the user is a CONSUMER,
   * a welcome notification is automatically sent. After registration, an access token
   * is generated and returned, allowing immediate authentication.
   * 
   * @param email - The user's email address (must be unique)
   * @param password - The plain text password (will be hashed before storage)
   * @param name - The user's display name
   * @param role - The user's role (CONSUMER, RETAILER, or ADMIN)
   * @returns Promise resolving to an object containing access_token and user data
   * @throws {Error} If a user with the provided email already exists
   * 
   * @example
   * ```typescript
   * const result = await authService.register(
   *   'newuser@example.com',
   *   'securePassword123',
   *   'John Doe',
   *   UserRole.CONSUMER
   * );
   * ```
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
      this.logger.warn(`Registration attempt failed: User already exists - ${email.substring(0, 3)}***`);
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

    this.logger.log(`User registered successfully - User ID: ${user.id}, Email: ${email.substring(0, 3)}***, Role: ${role}`);

    // Send welcome notification to consumers
    if (role === UserRole.CONSUMER) {
      this.notificationService
        .notifyConsumerWelcome(user.id)
        .catch((err) => {
          this.logger.error(`Error creating welcome notification for user ${user.id}:`, err);
        });
    }

    // Generate access token
    const { access_token } = await this.login(user);
    
    // Remove password from user object
    const { password: _, ...userWithoutPassword } = user;
    
    // Return access token and user data
    return {
      access_token,
      user: userWithoutPassword,
    };
  }
}
