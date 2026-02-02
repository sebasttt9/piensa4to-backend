import { SupabaseClient } from '@supabase/supabase-js';
import { CreateOrganizationDto, UpdateOrganizationDto } from './dto/organization.dto';
import { OrganizationEntity } from './entities/organization.entity';
export declare class OrganizationsService {
    private readonly supabase;
    private readonly supabaseData;
    constructor(supabase: SupabaseClient, supabaseData: SupabaseClient);
    private readonly tableName;
    private supportsExtendedColumns;
    create(dto: CreateOrganizationDto): Promise<OrganizationEntity>;
    findAll(): Promise<OrganizationEntity[]>;
    findOne(id: string): Promise<OrganizationEntity>;
    update(id: string, dto: UpdateOrganizationDto): Promise<OrganizationEntity>;
    remove(id: string): Promise<void>;
    private collectIds;
    private execSafe;
    private execRequired;
    private isIgnorableCleanupError;
    private toEntity;
    private shouldDowngradeOrgColumns;
}
