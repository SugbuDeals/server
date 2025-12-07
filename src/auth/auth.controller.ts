import {
  Body,
  Controller,
  Post,
  UnauthorizedException,
  UseGuards,
  Request,
  Logger,
} from '@nestjs/common';
import {
  ApiBody,
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDTO } from './dto/login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { LocalAuthGuard } from './local-auth.guard';
import { RegisterDTO } from './dto/register.dto';
import { PayloadDTO } from './dto/payload.dto';

/**
 * Authentication Controller
 * 
 * Handles HTTP requests for user authentication and registration.
 * Provides endpoints for logging in existing users and registering new accounts.
 * 
 * All endpoints return JWT access tokens for authenticated users, which should be
 * included in subsequent requests as Bearer tokens in the Authorization header.
 */
@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private authService: AuthService) {}

  /**
   * Authenticates a user and returns a JWT access token.
   * 
   * Validates the provided email and password credentials. If valid, returns
   * a JWT access token along with the user's information (excluding password).
   * 
   * @param loginDto - Login credentials containing email and password
   * @returns Object containing access_token and user data
   * @throws {UnauthorizedException} If credentials are invalid
   */
  @Post('login')
  @ApiOperation({ 
    summary: 'Login with email and password',
    description: 'Authenticates a user with email and password. Returns a JWT access token that should be used in the Authorization header for subsequent requests.'
  })
  @ApiBody({ type: LoginDTO })
  @ApiOkResponse({ 
    description: 'Authentication successful. Returns JWT access token and user payload',
    schema: {
      type: 'object',
      properties: {
        access_token: {
          type: 'string',
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
        },
        user: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 1 },
            email: { type: 'string', example: 'user@example.com' },
            name: { type: 'string', example: 'John Doe' },
            role: { type: 'string', enum: ['CONSUMER', 'RETAILER', 'ADMIN'], example: 'CONSUMER' }
          }
        }
      }
    }
  })
  @ApiUnauthorizedResponse({ 
    description: 'Invalid email or password credentials',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'Invalid credentials' }
      }
    }
  })
  async login(@Body() loginDto: LoginDTO) {
    this.logger.log(`Login attempt - Email: ${loginDto.email.substring(0, 3)}***`);
    
    const user = await this.authService.validateUser(
      loginDto.email,
      loginDto.password,
    );

    if (!user) {
      this.logger.warn(`Login failed: Invalid credentials - Email: ${loginDto.email.substring(0, 3)}***`);
      throw new UnauthorizedException('Invalid credentials');
    }
    
    const { access_token } = await this.authService.login(user);
    this.logger.log(`Login successful - User ID: ${user.id}, Role: ${user.role}`);

    return {
      access_token,
      user,
    };
  }

  /**
   * Registers a new user account.
   * 
   * Creates a new user account with the provided information. The password is
   * automatically hashed before storage. If the user role is CONSUMER, a welcome
   * notification is sent. Returns an access token for immediate authentication.
   * 
   * @param registerDto - Registration data containing email, password, name, and role
   * @returns Object containing access_token and user data
   * @throws {Error} If email already exists or validation fails
   */
  @Post('register')
  @ApiOperation({ 
    summary: 'Register a new user account',
    description: 'Creates a new user account. Password must be at least 6 characters. Email must be unique. Returns JWT access token for immediate authentication.'
  })
  @ApiBody({ type: RegisterDTO })
  @ApiCreatedResponse({ 
    description: 'User registered successfully. Returns JWT access token and user data.',
    schema: {
      type: 'object',
      properties: {
        access_token: {
          type: 'string',
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
        },
        user: {
          type: 'object',
          properties: {
            id: { type: 'number', example: 1 },
            email: { type: 'string', example: 'newuser@example.com' },
            name: { type: 'string', example: 'Jane Doe' },
            role: { type: 'string', enum: ['CONSUMER', 'RETAILER'], example: 'CONSUMER' }
          }
        }
      }
    }
  })
  @ApiBadRequestResponse({ 
    description: 'Registration failed - email already exists, validation error, or invalid role',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { 
          type: 'array',
          items: { type: 'string' },
          example: ['email must be an email', 'password must be longer than or equal to 6 characters']
        }
      }
    }
  })
  async register(@Body() registerDto: RegisterDTO) {
    this.logger.log(`Registration attempt - Email: ${registerDto.email.substring(0, 3)}***, Role: ${registerDto.role}`);
    
    try {
      const result = await this.authService.register(
        registerDto.email,
        registerDto.password,
        registerDto.name,
        registerDto.role
      );
      
      this.logger.log(`Registration successful - Email: ${registerDto.email.substring(0, 3)}***`);
      return result;
    } catch (error) {
      this.logger.error(`Registration failed - Email: ${registerDto.email.substring(0, 3)}***, Error: ${error.message}`);
      throw error;
    }
  }
}
