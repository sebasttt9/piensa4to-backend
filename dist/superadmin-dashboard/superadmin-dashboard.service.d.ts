import { SupabaseClient } from '@supabase/supabase-js';
import { ActiveUsersService } from '../common/services/active-users.service';
export interface SuperadminDashboardOverview {
    timestamp: string;
    activity: {
        onlineUsers: number;
        onlineAdmins: number;
        onlineSuperadmins: number;
        windowMinutes: number;
    };
    users: {
        total: number;
        approved: number;
        pending: number;
        admins: number;
        superadmins: number;
        averageUsersPerOrganization: number;
        recentSignups7d: number;
    };
    organizations: {
        total: number;
        withOwner: number;
        withoutOwner: number;
        withMembers: number;
        withoutMembers: number;
        createdLast30d: number;
    };
    datasets: {
        total: number;
        processed: number;
        pending: number;
        error: number;
        updatedLast7d: number;
    };
}
export declare class SuperadminDashboardService {
    private readonly supabase;
    private readonly supabaseData;
    private readonly activeUsersService;
    constructor(supabase: SupabaseClient, supabaseData: SupabaseClient, activeUsersService: ActiveUsersService);
    getOverview(): Promise<SuperadminDashboardOverview>;
}
