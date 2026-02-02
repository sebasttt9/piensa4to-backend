import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { ActiveUsersService } from '../../common/services/active-users.service';
declare const JwtStrategy_base: new (...args: [opt: import("passport-jwt").StrategyOptionsWithRequest] | [opt: import("passport-jwt").StrategyOptionsWithoutRequest]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class JwtStrategy extends JwtStrategy_base {
    private readonly configService;
    private readonly usersService;
    private readonly activeUsersService;
    constructor(configService: ConfigService, usersService: UsersService, activeUsersService: ActiveUsersService);
    validate(payload: JwtPayload): Promise<import("../../users/entities/user.entity").UserEntity>;
}
export {};
