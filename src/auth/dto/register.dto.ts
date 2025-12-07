import { IsEmail, IsEnum, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from 'generated/prisma';

/**
 * Registration Data Transfer Object
 * 
 * DTO for creating new user accounts. Contains all required information
 * to register a new user, including email, password, name, and role.
 * 
 * The password will be automatically hashed before storage. If the role is CONSUMER,
 * a welcome notification will be sent automatically.
 */
export class RegisterDTO {
  /**
   * User's email address
   * Must be unique and in valid email format
   */
  @ApiProperty({ 
    example: 'newuser@example.com',
    description: 'User email address (must be unique)',
    format: 'email'
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  /**
   * User's password
   * Must be at least 6 characters long. Will be hashed before storage.
   */
  @ApiProperty({ 
    example: 'securePassword123',
    description: 'User password (minimum 6 characters, will be hashed)',
    minLength: 6
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  /**
   * User's display name
   * The name that will be shown in the user's profile
   */
  @ApiProperty({ 
    example: 'Alice Doe',
    description: 'User display name'
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  /**
   * User's role
   * Determines the user's permissions and access level.
   * Only CONSUMER and RETAILER roles can be assigned during registration.
   * ADMIN role cannot be assigned through registration endpoint.
   */
  @ApiProperty({ 
    enum: [UserRole.CONSUMER, UserRole.RETAILER], 
    example: UserRole.CONSUMER,
    description: 'User role - CONSUMER or RETAILER (ADMIN cannot be assigned)'
  })
  @IsNotEmpty()
  @IsEnum(UserRole, { message: 'role must be CONSUMER or RETAILER' })
  role: UserRole;
}