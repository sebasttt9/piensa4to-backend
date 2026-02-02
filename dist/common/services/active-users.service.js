"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActiveUsersService = void 0;
const common_1 = require("@nestjs/common");
const roles_enum_1 = require("../constants/roles.enum");
let ActiveUsersService = class ActiveUsersService {
    sessions = new Map();
    ttlMs = 5 * 60 * 1000;
    registerActivity(userId, role) {
        const now = Date.now();
        this.sessions.set(userId, {
            role,
            lastSeenAt: now,
        });
        this.cleanup(now);
    }
    snapshot() {
        const now = Date.now();
        this.cleanup(now);
        let users = 0;
        let admins = 0;
        let superadmins = 0;
        for (const session of this.sessions.values()) {
            if (session.lastSeenAt < now - this.ttlMs) {
                continue;
            }
            switch (session.role) {
                case roles_enum_1.UserRole.SuperAdmin:
                    superadmins += 1;
                    break;
                case roles_enum_1.UserRole.Admin:
                    admins += 1;
                    break;
                default:
                    users += 1;
                    break;
            }
        }
        return {
            total: users + admins + superadmins,
            users,
            admins,
            superadmins,
            windowMinutes: Math.round(this.ttlMs / 60000),
        };
    }
    cleanup(referenceTime) {
        const expirationThreshold = referenceTime - this.ttlMs;
        for (const [userId, session] of this.sessions.entries()) {
            if (session.lastSeenAt < expirationThreshold) {
                this.sessions.delete(userId);
            }
        }
    }
};
exports.ActiveUsersService = ActiveUsersService;
exports.ActiveUsersService = ActiveUsersService = __decorate([
    (0, common_1.Injectable)()
], ActiveUsersService);
//# sourceMappingURL=active-users.service.js.map