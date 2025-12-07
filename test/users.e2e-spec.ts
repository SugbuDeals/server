import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { createMockPrisma, createMockUserWithoutPassword, createMockUser } from './utils/test-helpers';
import { validateUserResponse } from './utils/swagger-validator';
import { UserRole } from 'generated/prisma';
import { JwtService } from '@nestjs/jwt';

describe('Users (e2e)', () => {
  let app: INestApplication;
  let mockPrisma: jest.Mocked<PrismaService>;
  let jwtService: JwtService;
  let authToken: string;

  beforeAll(async () => {
    mockPrisma = createMockPrisma();
    
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    jwtService = moduleFixture.get<JwtService>(JwtService);
    const mockUser = createMockUserWithoutPassword();
    authToken = jwtService.sign({
      email: mockUser.email,
      sub: mockUser.id,
      role: mockUser.role,
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /user/:id', () => {
    it('should return 200 with UserResponseDto matching Swagger schema', async () => {
      const mockUser = createMockUserWithoutPassword();
      mockPrisma.user.findUnique = jest.fn().mockResolvedValue(mockUser);

      const response = await request(app.getHttpServer())
        .get(`/user/${mockUser.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(validateUserResponse(response.body)).toBe(true);
    });

    it('should return 401 when not authenticated', async () => {
      await request(app.getHttpServer())
        .get('/user/1')
        .expect(401);
    });
  });

  describe('GET /user', () => {
    it('should return 200 with array of UserResponseDto matching Swagger schema', async () => {
      const mockUsers = [
        createMockUserWithoutPassword({ id: 1 }),
        createMockUserWithoutPassword({ id: 2 }),
      ];
      mockPrisma.user.findMany = jest.fn().mockResolvedValue(mockUsers);

      const response = await request(app.getHttpServer())
        .get('/user')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      response.body.forEach((user: any) => {
        expect(validateUserResponse(user)).toBe(true);
      });
    });
  });
});

