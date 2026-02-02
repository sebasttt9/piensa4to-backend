import { Injectable, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT, SUPABASE_DATA_CLIENT } from '../database/supabase.constants';
import { CreateIssueDto } from './dto/create-issue.dto';
import { UpdateIssueDto } from './dto/update-issue.dto';
import { UsersService } from '../users/users.service';
import { UserEntity } from '../users/entities/user.entity';
import { UserSyncService } from '../users/user-sync.service';

@Injectable()
export class IssuesService {
    constructor(
        @Inject(SUPABASE_DATA_CLIENT)
        private readonly supabase: SupabaseClient,
        @Inject(SUPABASE_DATA_CLIENT)
        private readonly dataSupabase: SupabaseClient,
        private readonly usersService: UsersService,
        private readonly userSyncService: UserSyncService,
    ) { }

    async create(createIssueDto: CreateIssueDto, user: UserEntity) {
        // Ensure user exists in datasets database and get the correct ID for foreign key
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

        if (error) throw error;
        return this.mapIssue(data);
    }

    async findAll(ownerId: string, userRole: string = 'user', organizationId?: string) {
        let query = this.supabase
            .from('issues')
            .select(`
        *,
        createdBy:users!issues_owner_id_fkey(id, name, organization_id),
        inventoryItem:inventory_items!issues_inventory_item_id_fkey(id, name, organization_id)
      `)
            .order('created_at', { ascending: false });

        // Filter based on user role and organization
        if (userRole === 'admin' || userRole === 'superadmin') {
            // Admins and superadmins can see issues from their organization
            if (organizationId) {
                query = query.eq('organization_id', organizationId);
            }
        } else {
            // Regular users can only see their own issues
            query = query.eq('owner_id', ownerId);
        }

        const { data, error } = await query;

        if (error) throw error;
        return Array.isArray(data) ? data.map((record) => this.mapIssue(record)) : [];
    }

    async findOne(id: string, ownerId: string, userRole: string = 'user', organizationId?: string) {
        let query = this.supabase
            .from('issues')
            .select(`
        *,
        createdBy:users!issues_owner_id_fkey(id, name, organization_id),
        inventoryItem:inventory_items!issues_inventory_item_id_fkey(id, name, organization_id)
      `)
            .eq('id', id);

        // Filter based on user role and organization
        if (userRole === 'admin' || userRole === 'superadmin') {
            // Admins and superadmins can access issues from their organization
            if (organizationId) {
                query = query.eq('organization_id', organizationId);
            } else {
                query = query.eq('owner_id', ownerId);
            }
        } else {
            // Regular users can only access their own issues
            query = query.eq('owner_id', ownerId);
        }

        const { data, error } = await query.single();

        if (error) throw error;
        return this.mapIssue(data);
    }

    async update(id: string, updateIssueDto: UpdateIssueDto, ownerId: string, userRole: string = 'user', organizationId?: string) {
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

        if (error) throw error;
        return this.mapIssue(data);
    }

    async remove(id: string, ownerId: string, userRole: string = 'user', organizationId?: string) {
        await this.findOne(id, ownerId, userRole, organizationId);

        const { error } = await this.supabase
            .from('issues')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }

    private mapIssue(record: any) {
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
}
