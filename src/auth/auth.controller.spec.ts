import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LoginDTO } from './dto/login.dto';
import { RegisterDTO } from './dto/register.dto';
import { UserRole } from 'generated/prisma';
import {
  createMockUserWithoutPassword,
  createMockPayload,
} from '../../test/utils/test-helpers';
import { validateAuthResponse } from '../../test/utils/swagger-validator';

describe('AuthController', () => {
  let controller: AuthController;
  let service: AuthService;

  const mockAuthService = {
    validateUser: jest.fn(),
    login: jest.fn(),
    register: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /auth/login', () => {
    it('should return AuthResponseDto matching Swagger schema on successful login', async () => {
      const loginDto: LoginDTO = {
        email: 'test@example.com',
        password: 'password123',
      };

      const mockUser = createMockUserWithoutPassword();
      const mockToken = 'mock-jwt-token';

      mockAuthService.validateUser.mockResolvedValue(mockUser);
      mockAuthService.login.mockResolvedValue({ access_token: mockToken });

      const result = await controller.login(loginDto);

      expect(mockAuthService.validateUser).toHaveBeenCalledWith(
        loginDto.email,
        loginDto.password,
      );
      expect(mockAuthService.login).toHaveBeenCalledWith(mockUser);
      expect(validateAuthResponse(result)).toBe(true);
      expect(result).toHaveProperty('access_token', mockToken);
      expect(result).toHaveProperty('user', mockUser);
    });

    it('should throw UnauthorizedException when credentials are invalid', async () => {
      const loginDto: LoginDTO = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      mockAuthService.validateUser.mockResolvedValue(null);

      await expect(controller.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(controller.login(loginDto)).rejects.toThrow(
        'Invalid credentials',
      );

      expect(mockAuthService.validateUser).toHaveBeenCalledWith(
        loginDto.email,
        loginDto.password,
      );
      expect(mockAuthService.login).not.toHaveBeenCalled();
    });
  });

  describe('POST /auth/register', () => {
    it('should return AuthResponseDto matching Swagger schema on successful registration', async () => {
      const registerDto: RegisterDTO = {
        email: 'newuser@example.com',
        password: 'password123',
        name: 'New User',
        role: UserRole.CONSUMER,
      };

      const mockUser = createMockUserWithoutPassword({
        email: registerDto.email,
        name: registerDto.name,
        role: registerDto.role,
      });
      const mockToken = 'mock-jwt-token';

      mockAuthService.register.mockResolvedValue({
        access_token: mockToken,
        user: mockUser,
      });

      const result = await controller.register(registerDto);

      expect(mockAuthService.register).toHaveBeenCalledWith(
        registerDto.email,
        registerDto.password,
        registerDto.name,
        registerDto.role,
      );
      expect(validateAuthResponse(result)).toBe(true);
      expect(result).toHaveProperty('access_token', mockToken);
      expect(result).toHaveProperty('user', mockUser);
    });

    it('should propagate errors from AuthService', async () => {
      const registerDto: RegisterDTO = {
        email: 'existing@example.com',
        password: 'password123',
        name: 'Existing User',
        role: UserRole.CONSUMER,
      };

      const error = new Error('User already exists');
      mockAuthService.register.mockRejectedValue(error);

      await expect(controller.register(registerDto)).rejects.toThrow(
        'User already exists',
      );

      expect(mockAuthService.register).toHaveBeenCalledWith(
        registerDto.email,
        registerDto.password,
        registerDto.name,
        registerDto.role,
      );
    });
  });
});

