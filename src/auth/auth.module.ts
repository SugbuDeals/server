import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersModule } from 'src/users/users.module';
import { PassportModule } from '@nestjs/passport';
import { JwtAuthStrategy } from './jwt-auth.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { LocalAuthGuard } from './local-auth.guard';
import { LocalAuthStrategy } from './local-auth.strategy';
import { PrismaModule } from 'src/prisma/prisma.module';
import { NotificationModule } from 'src/notification/notification.module';
import { RolesGuard } from './roles.guard';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    PrismaModule,
    NotificationModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET as string,
      signOptions: { expiresIn: process.env.NODE_ENV === 'development' ? '10h' : '60s' },
    }),
  ],
  providers: [
    AuthService,
    LocalAuthStrategy,
    LocalAuthGuard,
    JwtAuthStrategy,
    JwtAuthGuard,
    RolesGuard,
  ],
  controllers: [AuthController],
})
export class AuthModule {}
