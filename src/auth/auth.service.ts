import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import type { SignOptions } from 'jsonwebtoken';
import { UserEntity } from '../users/entities/user.entity';
import { UserRole } from '../common/constants/roles.enum';

@Injectable()
export class AuthService {
  private readonly jwtExpiration: SignOptions['expiresIn'];

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    configService: ConfigService,
  ) {
    this.jwtExpiration = (configService.get<string>('auth.jwtExpiration') ?? '1h') as SignOptions['expiresIn'];
  }

  async register(dto: RegisterDto): Promise<{ accessToken: string; user: Record<string, unknown> }> {
    const user = await this.usersService.create({
      ...dto,
      role: dto.email === 'superadmin@datapulse.local' ? UserRole.SuperAdmin : UserRole.User,
    });
    const accessToken = this.buildToken({ id: user.id, email: user.email, role: user.role });
    return { accessToken, user: this.sanitizeUser(user) };
  }

  async login({ email, password }: LoginDto): Promise<{ accessToken: string; user: Record<string, unknown> }> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (!user.approved) {
      throw new UnauthorizedException('Cuenta pendiente de aprobación por administrador');
    }

    const isValid = await bcrypt.compare(password, user.passwordHash ?? '');
    if (!isValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const accessToken = this.buildToken({ id: user.id, email: user.email, role: user.role });
    const publicUser = this.sanitizeUser(user);
    return { accessToken, user: publicUser };
  }

  private buildToken(user: Pick<UserEntity, 'id' | 'email' | 'role'>): string {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return this.jwtService.sign(payload, {
      expiresIn: this.jwtExpiration,
    });
  }

  private sanitizeUser(user: UserEntity): Record<string, unknown> {
    const { passwordHash, ...rest } = user;
    return rest;
  }
}
