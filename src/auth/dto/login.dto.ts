import { IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Login Data Transfer Object
 * 
 * DTO for user authentication requests. Contains the email and password
 * credentials required to authenticate a user and receive a JWT access token.
 */
export class LoginDTO {
  /**
   * User's email address
   * Must be a valid email format
   */
  @ApiProperty({ 
    example: 'user@email.com',
    description: 'User email address',
    format: 'email'
  })
  @IsEmail()
  email: string;

  /**
   * User's password
   * Must not be empty
   */
  @ApiProperty({ 
    example: 'securePassword123',
    description: 'User password (plain text, will be validated against hashed password)',
    minLength: 1
  })
  @IsNotEmpty()
  password: string;
}
