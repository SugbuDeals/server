import {
  Controller,
  Delete,
  Param,
  UseGuards,
  UnauthorizedException,
  Request,
  Get,
  Query,
  Patch,
  Body,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { User, UserRole } from 'generated/prisma';
import { PayloadDTO } from 'src/auth/dto/payload.dto';
import { UpdateUserDTO } from './dto/updateUser.dto';

@ApiTags('Users')
@Controller('user')
export class UserController {
  constructor(private userService: UsersService) {}

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiParam({
    name: 'id',
    required: true,
    description: 'User id',
    type: Number,
  })
  @ApiOkResponse({ description: 'Returns the requested user' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async findUniqueUser(
    @Request() req: Request & { user: Omit<PayloadDTO, 'password'> },
  ): Promise<User | null> {
    return this.userService.user({ id: req.user.sub });
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiQuery({ name: 'email', required: false, type: String })
  @ApiQuery({ name: 'name', required: false, type: String })
  @ApiQuery({ name: 'take', required: false, type: Number })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiOkResponse({ description: 'Returns list of users' })
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
      orderBy: { createdAt: 'desc' },
    });
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiParam({
    name: 'id',
    required: true,
    description: 'User id',
    type: Number,
  })
  @ApiOkResponse({ description: 'User deleted successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
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

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiParam({
    name: 'id',
    required: true,
    description: 'User id',
    type: Number,
  })
  @ApiOkResponse({ description: 'User updated successfully' })
  @ApiBadRequestResponse({ description: 'Invalid user id' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async updateUser(
    @Request() req: Request & { user: Omit<PayloadDTO, 'password'> },
    @Param('id') id: string,
    @Body() body: UpdateUserDTO,
  ): Promise<User> {
    const userId = Number(id);
    const requestingUser = req.user;

    if (!userId || Number.isNaN(userId)) {
      throw new BadRequestException('Invalid user id');
    }

    if (
      requestingUser.role !== UserRole.ADMIN &&
      requestingUser.sub !== userId
    ) {
      throw new UnauthorizedException(
        'You are not authorized to update this user account',
      );
    }

    const data: any = {};
    if (typeof body.name === 'string') data.name = body.name;
    if (typeof body.email === 'string') data.email = body.email;
    if (
      typeof body.role !== 'undefined' &&
      requestingUser.role === UserRole.ADMIN
    ) {
      data.role = body.role;
    }

    return this.userService.update({ where: { id: userId }, data });
  }
}
