"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JwtStrategy = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const passport_jwt_1 = require("passport-jwt");
const config_1 = require("@nestjs/config");
const users_service_1 = require("../../users/users.service");
const active_users_service_1 = require("../../common/services/active-users.service");
let JwtStrategy = class JwtStrategy extends (0, passport_1.PassportStrategy)(passport_jwt_1.Strategy) {
    configService;
    usersService;
    activeUsersService;
    constructor(configService, usersService, activeUsersService) {
        super({
            jwtFromRequest: passport_jwt_1.ExtractJwt.fromAuthHeaderAsBearerToken(),
            secretOrKey: configService.getOrThrow('auth.jwtSecret'),
        });
        this.configService = configService;
        this.usersService = usersService;
        this.activeUsersService = activeUsersService;
    }
    async validate(payload) {
        const user = await this.usersService.findByEmail(payload.email).catch(() => {
            throw new common_1.UnauthorizedException('Usuario no autorizado');
        });
        if (!user) {
            throw new common_1.UnauthorizedException('Usuario no encontrado');
        }
        if (!user.approved) {
            throw new common_1.UnauthorizedException('Cuenta pendiente de aprobación por administrador');
        }
        this.activeUsersService.registerActivity(user.id, user.role);
        return user;
    }
};
exports.JwtStrategy = JwtStrategy;
exports.JwtStrategy = JwtStrategy = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        users_service_1.UsersService,
        active_users_service_1.ActiveUsersService])
], JwtStrategy);
//# sourceMappingURL=jwt.strategy.js.map