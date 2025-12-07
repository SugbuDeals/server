import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { createMockPrisma, createMockUser } from './utils/test-helpers';
import { validateAuthResponse } from './utils/swagger-validator';
import { UserRole } from 'generated/prisma';
import * as bcrypt from 'bcrypt';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let mockPrisma: jest.Mocked<PrismaService>;

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
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /auth/login', () => {
    it('should return 200 with AuthResponseDto matching Swagger schema', async () => {
      const mockUser = createMockUser({
        email: 'test@example.com',
        password: await bcrypt.hash('password123', 10),
      });

      mockPrisma.user.findUnique = jest.fn().mockResolvedValue(mockUser);

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'test@example.com', password: 'password123' })
        .expect(201);

      expect(validateAuthResponse(response.body)).toBe(true);
      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('user');
    });

    it('should return 401 when credentials are invalid', async () => {
      mockPrisma.user.findUnique = jest.fn().mockResolvedValue(null);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'test@example.com', password: 'wrongpassword' })
        .expect(401);
    });
  });

  describe('POST /auth/register', () => {
    it('should return 201 with AuthResponseDto matching Swagger schema', async () => {
      const mockUser = createMockUser({
        email: 'newuser@example.com',
        name: 'New User',
        role: UserRole.CONSUMER,
      });

      mockPrisma.user.findUnique = jest.fn()
        .mockResolvedValueOnce(null) // First call: check if user exists
        .mockResolvedValueOnce(mockUser); // Second call: after creation, for login
      mockPrisma.user.create = jest.fn().mockResolvedValue(mockUser);
      mockPrisma.notification.create = jest.fn().mockResolvedValue({});

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'newuser@example.com',
          password: 'password123',
          name: 'New User',
          role: UserRole.CONSUMER,
        })
        .expect(201);

      expect(validateAuthResponse(response.body)).toBe(true);
      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('user');
    });

    it('should return 500 when email already exists (service throws Error)', async () => {
      const existingUser = createMockUser({ email: 'existing@example.com' });
      mockPrisma.user.findUnique = jest.fn().mockResolvedValue(existingUser);

      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'existing@example.com',
          password: 'password123',
          name: 'Existing User',
          role: UserRole.CONSUMER,
        })
        .expect(500);
    });
  });
});

