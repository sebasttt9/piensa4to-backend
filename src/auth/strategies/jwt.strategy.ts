import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { ActiveUsersService } from '../../common/services/active-users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly activeUsersService: ActiveUsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.getOrThrow<string>('auth.jwtSecret'),
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.usersService.findByEmail(payload.email).catch(() => {
      throw new UnauthorizedException('Usuario no autorizado');
    });

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    if (!user.approved) {
      throw new UnauthorizedException('Cuenta pendiente de aprobación por administrador');
    }

    this.activeUsersService.registerActivity(user.id, user.role);

    return user;
  }
}
