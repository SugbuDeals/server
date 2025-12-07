import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from 'generated/prisma';

/**
 * User Response DTO
 * 
 * Response DTO for user data, excluding password field.
 * Matches the User model from Prisma schema.
 */
export class UserResponseDto {
  @ApiProperty({ example: 1, description: 'User ID' })
  id: number;

  @ApiProperty({ example: 'user@example.com', description: 'User email address' })
  email: string;

  @ApiProperty({ example: 'John Doe', description: 'User display name' })
  name: string;

  @ApiProperty({ 
    example: '2024-01-01T00:00:00.000Z', 
    description: 'Account creation timestamp',
    type: String,
    format: 'date-time'
  })
  createdAt: Date;

  @ApiProperty({ 
    enum: UserRole, 
    example: UserRole.CONSUMER,
    description: 'User role'
  })
  role: UserRole;

  @ApiPropertyOptional({ 
    example: 'http://localhost:3000/files/image.jpg', 
    description: 'User profile image URL',
    nullable: true
  })
  imageUrl: string | null;
}

