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
exports.IssuesService = void 0;
const common_1 = require("@nestjs/common");
const supabase_js_1 = require("@supabase/supabase-js");
const supabase_constants_1 = require("../database/supabase.constants");
const users_service_1 = require("../users/users.service");
const user_sync_service_1 = require("../users/user-sync.service");
let IssuesService = class IssuesService {
    supabase;
    dataSupabase;
    usersService;
    userSyncService;
    constructor(supabase, dataSupabase, usersService, userSyncService) {
        this.supabase = supabase;
        this.dataSupabase = dataSupabase;
        this.usersService = usersService;
        this.userSyncService = userSyncService;
    }
    async create(createIssueDto, user) {
        const datasetUser = await this.userSyncService.findOrCreateUserInDataDb(user.email);
        if (!datasetUser) {
            throw new Error('No se pudo sincronizar el usuario en la base de datos de datos');
        }
        const { inventoryItemId, ...issueData } = createIssueDto;
        const { data, error } = await this.supabase
            .from('issues')
            .insert({
            ...issueData,
            owner_id: datasetUser.id,
            created_by_id: datasetUser.id,
            inventory_item_id: inventoryItemId,
            organization_id: user.organizationId,
        })
            .select(`
        *,
        createdBy:users!issues_owner_id_fkey(id, name, organization_id),
        inventoryItem:inventory_items!issues_inventory_item_id_fkey(id, name, organization_id)
      `)
            .single();
        if (error)
            throw error;
        return this.mapIssue(data);
    }
    async findAll(ownerId, userRole = 'user', organizationId) {
        let query = this.supabase
            .from('issues')
            .select(`
        *,
        createdBy:users!issues_owner_id_fkey(id, name, organization_id),
        inventoryItem:inventory_items!issues_inventory_item_id_fkey(id, name, organization_id)
      `)
            .order('created_at', { ascending: false });
        if (userRole === 'admin' || userRole === 'superadmin') {
            if (organizationId) {
                query = query.eq('organization_id', organizationId);
            }
        }
        else {
            query = query.eq('owner_id', ownerId);
        }
        const { data, error } = await query;
        if (error)
            throw error;
        return Array.isArray(data) ? data.map((record) => this.mapIssue(record)) : [];
    }
    async findOne(id, ownerId, userRole = 'user', organizationId) {
        let query = this.supabase
            .from('issues')
            .select(`
        *,
        createdBy:users!issues_owner_id_fkey(id, name, organization_id),
        inventoryItem:inventory_items!issues_inventory_item_id_fkey(id, name, organization_id)
      `)
            .eq('id', id);
        if (userRole === 'admin' || userRole === 'superadmin') {
            if (organizationId) {
                query = query.eq('organization_id', organizationId);
            }
            else {
                query = query.eq('owner_id', ownerId);
            }
        }
        else {
            query = query.eq('owner_id', ownerId);
        }
        const { data, error } = await query.single();
        if (error)
            throw error;
        return this.mapIssue(data);
    }
    async update(id, updateIssueDto, ownerId, userRole = 'user', organizationId) {
        await this.findOne(id, ownerId, userRole, organizationId);
        const { data, error } = await this.supabase
            .from('issues')
            .update(updateIssueDto)
            .eq('id', id)
            .select(`
        *,
        createdBy:users!issues_owner_id_fkey(id, name, organization_id),
        inventoryItem:inventory_items!issues_inventory_item_id_fkey(id, name, organization_id)
      `)
            .single();
        if (error)
            throw error;
        return this.mapIssue(data);
    }
    async remove(id, ownerId, userRole = 'user', organizationId) {
        await this.findOne(id, ownerId, userRole, organizationId);
        const { error } = await this.supabase
            .from('issues')
            .delete()
            .eq('id', id);
        if (error)
            throw error;
    }
    mapIssue(record) {
        if (!record) {
            return record;
        }
        return {
            id: record.id,
            type: record.type,
            description: record.description,
            amount: record.amount ?? undefined,
            status: record.status,
            createdAt: record.created_at,
            updatedAt: record.updated_at,
            createdBy: record.createdBy
                ? {
                    id: record.createdBy.id,
                    name: record.createdBy.name ?? '',
                }
                : undefined,
            inventoryItem: record.inventoryItem
                ? {
                    id: record.inventoryItem.id,
                    name: record.inventoryItem.name,
                }
                : undefined,
        };
    }
};
exports.IssuesService = IssuesService;
exports.IssuesService = IssuesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(supabase_constants_1.SUPABASE_DATA_CLIENT)),
    __param(1, (0, common_1.Inject)(supabase_constants_1.SUPABASE_DATA_CLIENT)),
    __metadata("design:paramtypes", [supabase_js_1.SupabaseClient,
        supabase_js_1.SupabaseClient,
        users_service_1.UsersService,
        user_sync_service_1.UserSyncService])
], IssuesService);
//# sourceMappingURL=issues.service.js.map