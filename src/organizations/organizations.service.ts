import { Inject, Injectable, NotFoundException, InternalServerErrorException, ConflictException } from '@nestjs/common';
import { SupabaseClient, PostgrestError } from '@supabase/supabase-js';
import { SUPABASE_CLIENT, SUPABASE_DATA_CLIENT } from '../database/supabase.constants';
import { CreateOrganizationDto, UpdateOrganizationDto } from './dto/organization.dto';
import { OrganizationEntity } from './entities/organization.entity';

interface OrganizationRow {
    id: string;
    name: string;
    description: string | null;
    location?: string | null;
    owner: string | null;
    ci_ruc: string | null;
    business_email?: string | null;
    created_at: string;
    updated_at: string;
}

@Injectable()
export class OrganizationsService {
    constructor(
        @Inject(SUPABASE_CLIENT)
        private readonly supabase: SupabaseClient,
        @Inject(SUPABASE_DATA_CLIENT)
        private readonly supabaseData: SupabaseClient,
    ) { }

    private readonly tableName = 'organizations';
    private supportsExtendedColumns = true;

    async create(dto: CreateOrganizationDto): Promise<OrganizationEntity> {
        const buildPayload = (includeExtended: boolean) => {
            const payload: Record<string, unknown> = {
                name: dto.name,
                description: dto.description ?? null,
                owner: dto.owner ?? null,
                ci_ruc: dto.ciRuc ?? null,
            };

            if (includeExtended) {
                payload.location = dto.location ?? null;
                payload.business_email = dto.businessEmail ?? null;
            }

            return payload;
        };

        let { data, error } = await this.supabase
            .from(this.tableName)
            .insert(buildPayload(this.supportsExtendedColumns))
            .select('*')
            .single();

        if (error && this.supportsExtendedColumns && this.shouldDowngradeOrgColumns(error)) {
            this.supportsExtendedColumns = false;
            ({ data, error } = await this.supabase
                .from(this.tableName)
                .insert(buildPayload(false))
                .select('*')
                .single());
        }

        if (error) {
            console.error('Supabase error creando organización', error);
            throw new InternalServerErrorException('No se pudo crear la organización');
        }

        return this.toEntity(data as OrganizationRow);
    }

    async findAll(): Promise<OrganizationEntity[]> {
        const { data, error } = await this.supabase
            .from(this.tableName)
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Supabase error listando organizaciones', error);
            throw new InternalServerErrorException('No se pudieron listar las organizaciones');
        }

        return (data as OrganizationRow[]).map(row => this.toEntity(row));
    }

    async findOne(id: string): Promise<OrganizationEntity> {
        const { data, error } = await this.supabase
            .from(this.tableName)
            .select('*')
            .eq('id', id)
            .single();

        if (error || !data) {
            if (error) {
                console.error('Supabase error obteniendo organización', error);
            }
            throw new NotFoundException('Organización no encontrada');
        }

        return this.toEntity(data as OrganizationRow);
    }

    async update(id: string, dto: UpdateOrganizationDto): Promise<OrganizationEntity> {
        const buildPayload = (includeExtended: boolean) => {
            const payload: Record<string, unknown> = {};
            if (dto.name !== undefined) payload.name = dto.name;
            if (dto.description !== undefined) payload.description = dto.description ?? null;
            if (dto.owner !== undefined) payload.owner = dto.owner ?? null;
            if (dto.ciRuc !== undefined) payload.ci_ruc = dto.ciRuc ?? null;
            if (includeExtended) {
                if (dto.location !== undefined) payload.location = dto.location ?? null;
                if (dto.businessEmail !== undefined) payload.business_email = dto.businessEmail ?? null;
            }
            return payload;
        };

        const primaryPayload = buildPayload(this.supportsExtendedColumns);

        if (Object.keys(primaryPayload).length === 0) {
            return this.findOne(id);
        }

        let { data, error } = await this.supabase
            .from(this.tableName)
            .update(primaryPayload)
            .eq('id', id)
            .select('*')
            .maybeSingle();

        if ((error || !data) && this.supportsExtendedColumns && this.shouldDowngradeOrgColumns(error)) {
            this.supportsExtendedColumns = false;
            const fallbackPayload = buildPayload(false);
            if (Object.keys(fallbackPayload).length === 0) {
                return this.findOne(id);
            }
            ({ data, error } = await this.supabase
                .from(this.tableName)
                .update(fallbackPayload)
                .eq('id', id)
                .select('*')
                .maybeSingle());
        }

        if (error || !data) {
            if (error) {
                console.error('Supabase error actualizando organización', error);
            }
            throw new NotFoundException('Organización no encontrada');
        }

        return this.toEntity(data as OrganizationRow);
    }

    async remove(id: string): Promise<void> {
        // 1) Limpia relaciones en usuarios (primary DB) para evitar FK 23503
        await this.execRequired(
            this.supabase
                .from('users')
                .update({ organization_id: null, updated_at: new Date().toISOString() })
                .eq('organization_id', id),
            'users.clearOrganization',
        );

        // Verificación: asegura que no quedan usuarios referenciando la organización
        const { data: remainingUsers, error: remainingError } = await this.supabase
            .from('users')
            .select('id,email')
            .eq('organization_id', id);

        if (remainingError) {
            console.error('Supabase error verificando usuarios con organización antes de eliminarla', remainingError);
            throw new InternalServerErrorException('No se pudo verificar usuarios de la organización antes de eliminarla');
        }

        if ((remainingUsers ?? []).length > 0) {
            const sample = (remainingUsers ?? []).slice(0, 5).map((u) => u.email ?? u.id);
            throw new ConflictException(
                `La organización aún tiene usuarios asignados (${(remainingUsers ?? []).length}). Quita a los usuarios antes de eliminarla. Ejemplos: ${sample.join(', ')}`,
            );
        }

        // 2) Limpia datos operativos en datasets DB
        // Dashboards relacionados (para limpiar joins y shares)
        const dashboardIds = await this.collectIds(
            this.supabaseData
                .from('dashboards')
                .select('id')
                .eq('organization_id', id),
            'dashboards.fetchIds',
        );

        if (dashboardIds.length > 0) {
            await this.execSafe(
                this.supabaseData
                    .from('dashboard_datasets')
                    .delete()
                    .in('dashboard_id', dashboardIds),
                'dashboard_datasets.removeByDashboard',
            );

            await this.execSafe(
                this.supabaseData
                    .from('dashboard_shares')
                    .delete()
                    .in('dashboard_id', dashboardIds),
                'dashboard_shares.removeByDashboard',
            );
        }

        // Issues de la organización
        await this.execSafe(
            this.supabaseData
                .from('issues')
                .delete()
                .eq('organization_id', id),
            'issues.removeByOrganization',
        );

        // Ajustes e items de inventario
        await this.execSafe(
            this.supabaseData
                .from('inventory_adjustments')
                .delete()
                .eq('organization_id', id),
            'inventory_adjustments.removeByOrganization',
        );

        await this.execSafe(
            this.supabaseData
                .from('sales_order_items')
                .delete()
                .eq('organization_id', id),
            'sales_order_items.removeByOrganization',
        );

        await this.execSafe(
            this.supabaseData
                .from('sales_orders')
                .delete()
                .eq('organization_id', id),
            'sales_orders.removeByOrganization',
        );

        await this.execSafe(
            this.supabaseData
                .from('inventory_items')
                .delete()
                .eq('organization_id', id),
            'inventory_items.removeByOrganization',
        );

        // Datasets de la organización
        await this.execSafe(
            this.supabaseData
                .from('datasets')
                .delete()
                .eq('organization_id', id),
            'datasets.removeByOrganization',
        );

        // Dashboards de la organización
        await this.execSafe(
            this.supabaseData
                .from('dashboards')
                .delete()
                .eq('organization_id', id),
            'dashboards.removeByOrganization',
        );

        // 3) Finalmente elimina la organización (primary DB)
        const { error } = await this.supabase
            .from(this.tableName)
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Supabase error eliminando organización', error);
            throw new InternalServerErrorException('No se pudo eliminar la organización');
        }
    }

    private async collectIds(
        operation: PromiseLike<{ data: Array<{ id: string }> | null; error: PostgrestError | null }>,
        context: string,
    ): Promise<string[]> {
        try {
            const { data, error } = await operation;
            if (error && !this.isIgnorableCleanupError(error)) {
                console.warn(`No se pudieron recopilar IDs (${context}):`, error);
                return [];
            }
            return (data ?? []).map((row) => row.id);
        } catch (error) {
            console.warn(`Fallo inesperado recopilando IDs (${context}):`, error);
            return [];
        }
    }

    private async execSafe(
        operation: PromiseLike<{ error: PostgrestError | null }>,
        context: string,
    ): Promise<void> {
        try {
            const { error } = await operation;
            if (error && !this.isIgnorableCleanupError(error)) {
                console.warn(`No se pudo limpiar completamente (${context}).`, error);
            }
        } catch (error) {
            console.warn(`Fallo inesperado durante la limpieza (${context}).`, error);
        }
    }

    private async execRequired(
        operation: PromiseLike<{ error: PostgrestError | null }>,
        context: string,
    ): Promise<void> {
        const { error } = await operation;
        if (error) {
            console.error(`Error crítico durante la limpieza (${context}).`, error);
            throw new InternalServerErrorException('No se pudo preparar la eliminación de la organización (limpieza de usuarios)');
        }
    }

    private isIgnorableCleanupError(error?: PostgrestError | null): boolean {
        if (!error) return true;
        const ignorable = new Set([
            'PGRST116', // no rows
            '42P01',    // table missing
            '42703',    // column missing
            '42501',    // insufficient privilege
        ]);
        return ignorable.has(error.code ?? '');
    }

    private toEntity(row: OrganizationRow): OrganizationEntity {
        return {
            id: row.id,
            name: row.name,
            description: row.description ?? undefined,
            location: row.location ?? undefined,
            owner: row.owner ?? undefined,
            ciRuc: row.ci_ruc ?? undefined,
            businessEmail: row.business_email ?? undefined,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }

    private shouldDowngradeOrgColumns(error: unknown): boolean {
        if (!error || typeof error !== 'object') {
            return false;
        }

        const code = (error as { code?: string }).code;
        return code === '42703' || code === 'PGRST204';
    }
}