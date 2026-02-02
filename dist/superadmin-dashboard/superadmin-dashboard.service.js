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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SuperadminDashboardService = void 0;
const common_1 = require("@nestjs/common");
const supabase_js_1 = require("@supabase/supabase-js");
const supabase_constants_1 = require("../database/supabase.constants");
const roles_enum_1 = require("../common/constants/roles.enum");
const active_users_service_1 = require("../common/services/active-users.service");
let SuperadminDashboardService = class SuperadminDashboardService {
    supabase;
    supabaseData;
    activeUsersService;
    constructor(supabase, supabaseData, activeUsersService) {
        this.supabase = supabase;
        this.supabaseData = supabaseData;
        this.activeUsersService = activeUsersService;
    }
    async getOverview() {
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
            throw new common_1.InternalServerErrorException('No se pudieron obtener los usuarios para el panel de control.');
        }
        if (organizationsResult.error) {
            throw new common_1.InternalServerErrorException('No se pudieron obtener las organizaciones para el panel de control.');
        }
        if (datasetsResult.error) {
            throw new common_1.InternalServerErrorException('No se pudieron obtener los datasets para el panel de control.');
        }
        const users = (usersResult.data ?? []);
        const organizations = (organizationsResult.data ?? []);
        const datasets = (datasetsResult.data ?? []);
        const now = Date.now();
        const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
        const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
        const recentUsers = users.filter((user) => new Date(user.created_at).getTime() >= now - sevenDaysMs).length;
        const organizationsCreatedLast30d = organizations.filter((organization) => new Date(organization.created_at).getTime() >= now - thirtyDaysMs).length;
        const datasetsUpdatedLast7d = datasets.filter((dataset) => new Date(dataset.updated_at).getTime() >= now - sevenDaysMs).length;
        const superadmins = users.filter((user) => user.role === roles_enum_1.UserRole.SuperAdmin).length;
        const admins = users.filter((user) => user.role === roles_enum_1.UserRole.Admin).length;
        const approved = users.filter((user) => user.approved).length;
        const pending = users.length - approved;
        const organizationMembership = new Map();
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
        const datasetStatusCounts = datasets.reduce((acc, dataset) => {
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
        }, { total: 0, processed: 0, pending: 0, error: 0 });
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
};
exports.SuperadminDashboardService = SuperadminDashboardService;
exports.SuperadminDashboardService = SuperadminDashboardService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(supabase_constants_1.SUPABASE_CLIENT)),
    __param(1, (0, common_1.Inject)(supabase_constants_1.SUPABASE_DATA_CLIENT)),
    __metadata("design:paramtypes", [supabase_js_1.SupabaseClient,
        supabase_js_1.SupabaseClient,
        active_users_service_1.ActiveUsersService])
], SuperadminDashboardService);
//# sourceMappingURL=superadmin-dashboard.service.js.map