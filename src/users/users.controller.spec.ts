import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { UserController } from './users.controller';
import { UsersService } from './users.service';
import { UpdateUserDTO } from './dto/updateUser.dto';
import { UserRole } from 'generated/prisma';
import {
  createMockUserWithoutPassword,
  createMockPayload,
  createMockRequest,
} from '../../test/utils/test-helpers';
import { validateUserResponse } from '../../test/utils/swagger-validator';

describe('UserController', () => {
  let controller: UserController;
  let service: UsersService;

  const mockUsersService = {
    user: jest.fn(),
    users: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /user/:id', () => {
    it('should return UserResponseDto matching Swagger schema', async () => {
      const mockUser = createMockUserWithoutPassword();
      const mockRequest = createMockRequest({ sub: mockUser.id });

      mockUsersService.user.mockResolvedValue(mockUser);

      const result = await controller.findUniqueUser(mockRequest);

      expect(mockUsersService.user).toHaveBeenCalledWith({ id: mockRequest.user.sub });
      expect(validateUserResponse(result)).toBe(true);
      expect(result).toEqual(mockUser);
    });

    it('should return null when user is not found', async () => {
      const mockRequest = createMockRequest();
      mockUsersService.user.mockResolvedValue(null);

      const result = await controller.findUniqueUser(mockRequest);

      expect(result).toBeNull();
    });
  });

  describe('GET /user', () => {
    it('should return array of UserResponseDto matching Swagger schema', async () => {
      const mockUsers = [
        createMockUserWithoutPassword({ id: 1 }),
        createMockUserWithoutPassword({ id: 2 }),
      ];

      mockUsersService.users.mockResolvedValue(mockUsers);

      const result = await controller.findManyUsers();

      expect(mockUsersService.users).toHaveBeenCalled();
      expect(Array.isArray(result)).toBe(true);
      result.forEach((user) => {
        expect(validateUserResponse(user)).toBe(true);
      });
    });

    it('should filter by email when provided', async () => {
      const mockUsers = [createMockUserWithoutPassword()];
      mockUsersService.users.mockResolvedValue(mockUsers);

      await controller.findManyUsers('test@example.com');

      expect(mockUsersService.users).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            email: expect.objectContaining({ contains: 'test@example.com' }),
          }),
        }),
      );
    });
  });

  describe('DELETE /user/:id', () => {
    it('should delete user when user is deleting own account', async () => {
      const userId = 1;
      const mockUser = createMockUserWithoutPassword({ id: userId });
      const mockRequest = createMockRequest({ sub: userId });

      mockUsersService.delete.mockResolvedValue(mockUser);

      const result = await controller.deleteUser(mockRequest, userId.toString());

      expect(mockUsersService.delete).toHaveBeenCalledWith({
        where: { id: userId },
      });
      expect(result).toEqual(mockUser);
    });

    it('should delete user when admin is deleting any account', async () => {
      const userId = 2;
      const mockUser = createMockUserWithoutPassword({ id: userId });
      const mockRequest = createMockRequest({
        sub: 1,
        role: UserRole.ADMIN,
      });

      mockUsersService.delete.mockResolvedValue(mockUser);

      const result = await controller.deleteUser(mockRequest, userId.toString());

      expect(mockUsersService.delete).toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });

    it('should throw ForbiddenException when user tries to delete another user account', async () => {
      const userId = 2;
      const mockRequest = createMockRequest({ sub: 1, role: UserRole.CONSUMER });

      await expect(
        controller.deleteUser(mockRequest, userId.toString()),
      ).rejects.toThrow(ForbiddenException);

      expect(mockUsersService.delete).not.toHaveBeenCalled();
    });
  });

  describe('PATCH /user/:id', () => {
    it('should update user when user is updating own account', async () => {
      const userId = 1;
      const updateDto: UpdateUserDTO = { name: 'Updated Name' };
      const updatedUser = createMockUserWithoutPassword({
        id: userId,
        name: 'Updated Name',
      });
      const mockRequest = createMockRequest({ sub: userId });

      mockUsersService.update.mockResolvedValue(updatedUser);

      const result = await controller.updateUser(mockRequest, userId.toString(), updateDto);

      expect(mockUsersService.update).toHaveBeenCalled();
      expect(validateUserResponse(result)).toBe(true);
      expect(result.name).toBe('Updated Name');
    });

    it('should throw BadRequestException for invalid user ID', async () => {
      const mockRequest = createMockRequest();
      const updateDto: UpdateUserDTO = { name: 'Updated Name' };

      await expect(
        controller.updateUser(mockRequest, 'invalid', updateDto),
      ).rejects.toThrow(BadRequestException);

      expect(mockUsersService.update).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when user tries to update another user account', async () => {
      const userId = 2;
      const updateDto: UpdateUserDTO = { name: 'Updated Name' };
      const mockRequest = createMockRequest({ sub: 1, role: UserRole.CONSUMER });

      await expect(
        controller.updateUser(mockRequest, userId.toString(), updateDto),
      ).rejects.toThrow(ForbiddenException);

      expect(mockUsersService.update).not.toHaveBeenCalled();
    });
  });

  describe('PATCH /user/:id/approve', () => {
    it('should approve retailer when admin calls endpoint', async () => {
      const userId = 2;
      const updatedUser = createMockUserWithoutPassword({
        id: userId,
        role: UserRole.RETAILER,
      });
      const mockRequest = createMockRequest({ sub: 1, role: UserRole.ADMIN });

      mockUsersService.update.mockResolvedValue(updatedUser);

      const result = await controller.approveRetailer(mockRequest, userId.toString());

      expect(mockUsersService.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { role: UserRole.RETAILER },
      });
      expect(validateUserResponse(result)).toBe(true);
      expect(result.role).toBe(UserRole.RETAILER);
    });

    it('should throw BadRequestException for invalid user ID', async () => {
      const mockRequest = createMockRequest({ role: UserRole.ADMIN });

      await expect(
        controller.approveRetailer(mockRequest, 'invalid'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException when non-admin calls endpoint', async () => {
      const userId = 2;
      const mockRequest = createMockRequest({ sub: 1, role: UserRole.CONSUMER });

      await expect(
        controller.approveRetailer(mockRequest, userId.toString()),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});

