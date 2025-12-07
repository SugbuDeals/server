import { PrismaService } from '../../src/prisma/prisma.service';
import { UserRole } from 'generated/prisma';
import { PayloadDTO } from '../../src/auth/dto/payload.dto';

/**
 * Creates a mock PrismaService with all methods mocked
 * @returns Mocked PrismaService instance
 */
export function createMockPrisma(): jest.Mocked<PrismaService> {
  return {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    store: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    product: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    category: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    promotion: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    storeBookmark: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    productBookmark: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    subscription: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    userSubscription: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    notification: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $on: jest.fn(),
    $transaction: jest.fn(),
    $use: jest.fn(),
    $extends: jest.fn(),
  } as unknown as jest.Mocked<PrismaService>;
}

/**
 * Creates a mock user object for testing
 */
export function createMockUser(overrides?: Partial<any>) {
  return {
    id: 1,
    email: 'test@example.com',
    password: '$2b$10$hashedpassword',
    name: 'Test User',
    role: UserRole.CONSUMER,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    imageUrl: null,
    ...overrides,
  };
}

/**
 * Creates a mock user without password for responses
 */
export function createMockUserWithoutPassword(overrides?: Partial<any>) {
  const user = createMockUser(overrides);
  const { password, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

/**
 * Creates a mock JWT payload for testing
 */
export function createMockPayload(overrides?: Partial<PayloadDTO>): PayloadDTO {
  return {
    email: 'test@example.com',
    sub: 1,
    role: UserRole.CONSUMER,
    ...overrides,
  };
}

/**
 * Creates a mock request object with user payload
 */
export function createMockRequest(user?: Partial<PayloadDTO>) {
  return {
    user: user ? { ...createMockPayload(), ...user } : createMockPayload(),
  } as any;
}

/**
 * Creates a mock guard that allows access
 */
export function createAllowGuard() {
  return {
    canActivate: jest.fn(() => true),
  };
}

/**
 * Creates a mock guard that denies access
 */
export function createDenyGuard() {
  return {
    canActivate: jest.fn(() => false),
  };
}

