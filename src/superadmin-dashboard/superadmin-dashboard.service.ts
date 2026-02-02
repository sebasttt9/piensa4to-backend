import { Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT, SUPABASE_DATA_CLIENT } from '../database/supabase.constants';
import { UserRole } from '../common/constants/roles.enum';
import { ActiveUsersService } from '../common/services/active-users.service';

interface UserRow {
    id: string;
    role: UserRole;
    approved: boolean;
    organization_id: string | null;
    created_at: string;
    updated_at: string;
}

interface OrganizationRow {
    id: string;
    owner: string | null;
    created_at: string;
    updated_at: string;
}

interface DatasetRow {
    id: string;
    status: 'pending' | 'processed' | 'error';
    updated_at: string;
}

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

@Injectable()
export class SuperadminDashboardService {
    constructor(
        @Inject(SUPABASE_CLIENT)
        private readonly supabase: SupabaseClient,
        @Inject(SUPABASE_DATA_CLIENT)
        private readonly supabaseData: SupabaseClient,
        private readonly activeUsersService: ActiveUsersService,
    ) { }

    async getOverview(): Promise<SuperadminDashboardOverview> {
        const [usersResult, organizationsResult, datasetsResult] = await Promise.all([
            this.supabase
                .from('users')
                .select('id, role, approved, organization_id, created_at, updated_at'),
            this.supabase
                .from('organizations')
                .select('id, owner, created_at, updated_at'),
            this.supabaseData
                .from('datasets')
                .select('id, status, updated_at'),
        ]);

        if (usersResult.error) {
            throw new InternalServerErrorException('No se pudieron obtener los usuarios para el panel de control.');
        }

        if (organizationsResult.error) {
            throw new InternalServerErrorException('No se pudieron obtener las organizaciones para el panel de control.');
        }

        if (datasetsResult.error) {
            throw new InternalServerErrorException('No se pudieron obtener los datasets para el panel de control.');
        }

        const users = (usersResult.data ?? []) as UserRow[];
        const organizations = (organizationsResult.data ?? []) as OrganizationRow[];
        const datasets = (datasetsResult.data ?? []) as DatasetRow[];

        const now = Date.now();
        const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
        const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
        const recentUsers = users.filter((user) => new Date(user.created_at).getTime() >= now - sevenDaysMs).length;
        const organizationsCreatedLast30d = organizations.filter((organization) => new Date(organization.created_at).getTime() >= now - thirtyDaysMs).length;
        const datasetsUpdatedLast7d = datasets.filter((dataset) => new Date(dataset.updated_at).getTime() >= now - sevenDaysMs).length;

        const superadmins = users.filter((user) => user.role === UserRole.SuperAdmin).length;
        const admins = users.filter((user) => user.role === UserRole.Admin).length;
        const approved = users.filter((user) => user.approved).length;
        const pending = users.length - approved;

        const organizationMembership = new Map<string, number>();
        users.forEach((user) => {
            if (user.organization_id) {
                const count = organizationMembership.get(user.organization_id) ?? 0;
                organizationMembership.set(user.organization_id, count + 1);
            }
        });

        const organizationsWithMembers = Array.from(organizationMembership.keys()).length;
        const organizationsWithoutMembers = Math.max(organizations.length - organizationsWithMembers, 0);
        const organizationsWithOwner = organizations.filter((organization) => organization.owner).length;
        const organizationsWithoutOwner = organizations.length - organizationsWithOwner;

        const averageUsersPerOrganization = organizationsWithMembers === 0
            ? 0
            : organizationMembership.size === 0
                ? 0
                : Number((Array.from(organizationMembership.values()).reduce((sum, count) => sum + count, 0) / organizationMembership.size).toFixed(2));

        const datasetStatusCounts = datasets.reduce(
            (acc, dataset) => {
                acc.total += 1;
                switch (dataset.status) {
                    case 'processed':
                        acc.processed += 1;
                        break;
                    case 'error':
                        acc.error += 1;
                        break;
                    default:
                        acc.pending += 1;
                        break;
                }
                return acc;
            },
            { total: 0, processed: 0, pending: 0, error: 0 },
        );

        const activity = this.activeUsersService.snapshot();

        return {
            timestamp: new Date().toISOString(),
            activity: {
                onlineUsers: activity.users,
                onlineAdmins: activity.admins,
                onlineSuperadmins: activity.superadmins,
                windowMinutes: activity.windowMinutes,
            },
            users: {
                total: users.length,
                approved,
                pending,
                admins,
                superadmins,
                averageUsersPerOrganization,
                recentSignups7d: recentUsers,
            },
            organizations: {
                total: organizations.length,
                withOwner: organizationsWithOwner,
                withoutOwner: organizationsWithoutOwner,
                withMembers: organizationsWithMembers,
                withoutMembers: organizationsWithoutMembers,
                createdLast30d: organizationsCreatedLast30d,
            },
            datasets: {
                total: datasetStatusCounts.total,
                processed: datasetStatusCounts.processed,
                pending: datasetStatusCounts.pending,
                error: datasetStatusCounts.error,
                updatedLast7d: datasetsUpdatedLast7d,
            },
        };
    }
}
