import {
  Controller,
  Delete,
  Param,
  UseGuards,
  UnauthorizedException,
  Request,
  Get,
  Query,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { User, UserRole } from 'generated/prisma';
import { PayloadDTO } from 'src/auth/dto/payload.dto';

@Controller('user')
export class UserController {
  constructor(private userService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findUniqueUser(
    @Request() req: Request & { user: Omit<PayloadDTO, 'password'> },

  ): Promise<User | null> {
    return this.userService.user({ id: req.user.sub });
  }

  //@UseGuards(JwtAuthGuard)
  @Get()
  async findManyUsers(
    @Query('email') email?: string,
    @Query('name') name?: string,
    @Query('take') take = '10',
    @Query('skip') skip = '0',
  ): Promise<User[]> {
    const where: any = {};
    
    if (email) {
      where.email = { contains: email, mode: 'insensitive' };
    }
    
    if (name) {
      where.name = { contains: name, mode: 'insensitive' };
    }

    return this.userService.users({
      where,
      take: parseInt(take),
      skip: parseInt(skip),
      orderBy: { createdAt: 'desc' }
    });
  }

  //@UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deleteUser(
    @Request() req: Request & { user: Omit<PayloadDTO, 'password'> },
    @Param('id') id: string,
  ): Promise<User | null> {
    const userId = Number(id);
    const requestingUser = req.user;

    // Allow deletion if user is admin or if user is deleting their own account
    if (
      requestingUser.role === UserRole.ADMIN ||
      requestingUser.sub === userId
    ) {
      return this.userService.delete({ where: { id: userId } });
    }

    throw new UnauthorizedException(
      'You are not authorized to delete this user account',
    );
  }
}
