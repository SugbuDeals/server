import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from 'src/users/dto/user-response.dto';

/**
 * Login/Register Response DTO
 * 
 * Response DTO for authentication endpoints (login and register).
 * Returns access token and user information.
 */
export class AuthResponseDto {
  @ApiProperty({ 
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...', 
    description: 'JWT access token'
  })
  access_token: string;

  @ApiProperty({ 
    type: UserResponseDto, 
    description: 'User information (excluding password)'
  })
  user: UserResponseDto;
}

