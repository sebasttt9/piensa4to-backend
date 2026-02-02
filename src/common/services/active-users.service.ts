import { Injectable } from '@nestjs/common';
import { UserRole } from '../constants/roles.enum';

interface ActiveSession {
    role: UserRole;
    lastSeenAt: number;
}

export interface ActiveUsersSnapshot {
    total: number;
    users: number;
    admins: number;
    superadmins: number;
    windowMinutes: number;
}

@Injectable()
export class ActiveUsersService {
    private readonly sessions = new Map<string, ActiveSession>();
    private readonly ttlMs = 5 * 60 * 1000; // 5 minutes activity window

    registerActivity(userId: string, role: UserRole): void {
        const now = Date.now();
        this.sessions.set(userId, {
            role,
            lastSeenAt: now,
        });
        this.cleanup(now);
    }

    snapshot(): ActiveUsersSnapshot {
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
                case UserRole.SuperAdmin:
                    superadmins += 1;
                    break;
                case UserRole.Admin:
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

    private cleanup(referenceTime: number): void {
        const expirationThreshold = referenceTime - this.ttlMs;
        for (const [userId, session] of this.sessions.entries()) {
            if (session.lastSeenAt < expirationThreshold) {
                this.sessions.delete(userId);
            }
        }
    }
}
