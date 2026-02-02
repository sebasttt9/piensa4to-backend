import { CreateDashboardDto } from './dto/create-dashboard.dto';
import { UpdateDashboardDto } from './dto/update-dashboard.dto';
import { DatasetsService } from '../datasets/datasets.service';
import { SupabaseClient } from '@supabase/supabase-js';
import { DashboardEntity } from './entities/dashboard.entity';
import { ShareDashboardDto, ShareChannel } from './dto/share-dashboard.dto';
export interface DashboardShareEntity {
    id: string;
    dashboardId: string;
    ownerId: string;
    channel: ShareChannel;
    contact: string;
    message?: string;
    status: 'pending' | 'sent' | 'failed';
    createdAt: string;
}
export declare class DashboardsService {
    private readonly supabase;
    private readonly datasetsService;
    constructor(supabase: SupabaseClient, datasetsService: DatasetsService);
    private readonly tableName;
    private readonly shareTableName;
    private readonly datasetsJoinTable;
    create(ownerId: string, dto: CreateDashboardDto, userRole: string | undefined, organizationId: string): Promise<DashboardEntity>;
    findAll(ownerId: string, userRole: string | undefined, skip: number | undefined, limit: number | undefined, organizationId: string): Promise<DashboardEntity[]>;
    countByUser(ownerId: string, userRole: string | undefined, organizationId: string): Promise<number>;
    findOne(ownerId: string, id: string, userRole: string | undefined, organizationId: string): Promise<DashboardEntity>;
    update(ownerId: string, id: string, dto: UpdateDashboardDto, userRole: string | undefined, organizationId: string): Promise<DashboardEntity>;
    share(ownerId: string, id: string, isPublic: boolean, userRole: string | undefined, organizationId: string): Promise<DashboardEntity>;
    remove(ownerId: string, id: string, userRole: string | undefined, organizationId: string): Promise<void>;
    shareWithContact(ownerId: string, id: string, dto: ShareDashboardDto, userRole: string | undefined, organizationId: string): Promise<DashboardShareEntity>;
    export(ownerId: string, id: string, format: 'pdf' | 'json', userRole: string | undefined, organizationId: string): Promise<DashboardEntity | Buffer>;
    private toEntity;
    private toShareEntity;
    private replaceDashboardDatasets;
    private collectDatasetIds;
    approveDashboard(ownerId: string, dashboardId: string, status: 'approved' | 'rejected', userRole: string | undefined, organizationId: string): Promise<DashboardEntity>;
}
