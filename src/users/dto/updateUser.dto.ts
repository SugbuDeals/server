import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from 'generated/prisma';

/**
 * Update User Data Transfer Object
 * 
 * DTO for updating user account information. All fields are optional.
 * Only admins can update the role field. Users can update their own
 * name, email, and imageUrl.
 */
export class UpdateUserDTO {
  /**
   * User's display name
   * Optional - only updates if provided
   */
  @ApiPropertyOptional({ 
    example: 'Jane Doe',
    description: 'User display name'
  })
  @IsString()
  @IsOptional()
  name?: string;

  /**
   * User's email address
   * Optional - must be valid email format if provided
   */
  @ApiPropertyOptional({ 
    example: 'jane@example.com',
    description: 'User email address (must be unique)',
    format: 'email'
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  /**
   * User's role
   * Optional - only admins can update this field
   */
  @ApiPropertyOptional({ 
    enum: UserRole,
    description: 'User role - only admins can change this',
    example: UserRole.RETAILER
  })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  /**
   * URL of the user's profile image
   * Optional - can be set to null to remove image
   */
  @ApiPropertyOptional({
    example: 'http://localhost:3000/files/file-1762098832774-779762879.webp',
    description: 'URL of the user\'s profile image. Set to null to remove image.',
    required: false,
    nullable: true
  })
  @IsOptional()
  @IsString()
  imageUrl?: string | null;
}
