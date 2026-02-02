import { SupabaseClient } from '@supabase/supabase-js';
import { CreateIssueDto } from './dto/create-issue.dto';
import { UpdateIssueDto } from './dto/update-issue.dto';
import { UsersService } from '../users/users.service';
import { UserEntity } from '../users/entities/user.entity';
import { UserSyncService } from '../users/user-sync.service';
export declare class IssuesService {
    private readonly supabase;
    private readonly dataSupabase;
    private readonly usersService;
    private readonly userSyncService;
    constructor(supabase: SupabaseClient, dataSupabase: SupabaseClient, usersService: UsersService, userSyncService: UserSyncService);
    create(createIssueDto: CreateIssueDto, user: UserEntity): Promise<any>;
    findAll(ownerId: string, userRole?: string, organizationId?: string): Promise<any[]>;
    findOne(id: string, ownerId: string, userRole?: string, organizationId?: string): Promise<any>;
    update(id: string, updateIssueDto: UpdateIssueDto, ownerId: string, userRole?: string, organizationId?: string): Promise<any>;
    remove(id: string, ownerId: string, userRole?: string, organizationId?: string): Promise<void>;
    private mapIssue;
}
