import { UserRole } from '../constants/roles.enum';
export interface ActiveUsersSnapshot {
    total: number;
    users: number;
    admins: number;
    superadmins: number;
    windowMinutes: number;
}
export declare class ActiveUsersService {
    private readonly sessions;
    private readonly ttlMs;
    registerActivity(userId: string, role: UserRole): void;
    snapshot(): ActiveUsersSnapshot;
    private cleanup;
}
