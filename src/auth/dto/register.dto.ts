import { IsEmail, IsEnum, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from 'generated/prisma';

export class RegisterDTO {
  @ApiProperty({ example: 'newuser@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'Alice Doe' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: [UserRole.CONSUMER, UserRole.RETAILER], example: UserRole.CONSUMER })
  @IsNotEmpty()
  @IsEnum(UserRole, { message: 'role must be CONSUMER or RETAILER' })
  role: UserRole;
}