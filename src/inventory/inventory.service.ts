import { Inject, Injectable, InternalServerErrorException, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_DATA_CLIENT } from '../database/supabase.constants';
import { AnalyticsService, OverviewAnalytics } from '../analytics/analytics.service';
import { CreateInventoryItemDto, UpdateInventoryItemDto } from './dto/inventory-item.dto';
import { UserRole } from '../common/constants/roles.enum';

interface DatasetRow {
    id: string;
    owner_id: string;
    name: string;
    status: 'pending' | 'processed' | 'error';
    row_count: number | null;
    updated_at: string;
    tags: string[] | null;
}

interface DashboardRow {
    id: string;
    owner_id: string;
    name: string;
    dataset_ids: string[] | null;
    updated_at: string;
}

interface InventoryAdjustmentRow {
    dataset_id: string;
    owner_id: string;
    adjustment: number;
    updated_at: string;
}

interface InventoryItemRow {
    id: string;
    owner_id: string;
    organization_id: string;
    dataset_id: string | null;
    dashboard_id: string | null;
    name: string;
    code: string;
    quantity: number;
    pvp: number;
    cost: number;
    status: 'pending' | 'approved' | 'rejected';
    approved_by: string | null;
    approved_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface InventoryItem {
    id: string;
    ownerId: string;
    datasetId: string | null;
    dashboardId: string | null;
    name: string;
    code: string;
    quantity: number;
    pvp: number;
    cost: number;
    status: 'pending' | 'approved' | 'rejected';
    approvedBy: string | null;
    approvedAt: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface InventoryDashboardSummary {
    id: string;
    name: string;
    updatedAt: string;
}

export interface InventoryDatasetSummary {
    id: string;
    name: string;
    status: 'pending' | 'processed' | 'error';
    rowCount: number;
    updatedAt: string;
    tags: string[];
}

export interface InventoryRecord {
    dataset: InventoryDatasetSummary;
    dashboards: InventoryDashboardSummary[];
    adjustment: number;
    total: number;
}

export interface InventorySummary {
    overview: OverviewAnalytics | null;
    totals: {
        baseUnits: number;
        adjustedUnits: number;
        datasetsWithAlerts: number;
        dashboardsLinked: number;
    };
    records: InventoryRecord[];
}

@Injectable()
export class InventoryService {
    private readonly inventoryTable = 'inventory_adjustments';
    private readonly itemsTable = 'inventory_items';
    private readonly datasetsTable = 'datasets';
    private readonly dashboardsTable = 'dashboards';

    constructor(
        @Inject(SUPABASE_DATA_CLIENT)
        private readonly supabase: SupabaseClient,
        private readonly analyticsService: AnalyticsService,
    ) { }

    async getInventory(ownerId: string, userRole: UserRole = UserRole.User, organizationId?: string): Promise<InventorySummary> {
        if (userRole === UserRole.SuperAdmin) {
            throw new ForbiddenException('El superadmin no puede consultar inventario.');
        }

        if (!organizationId) {
            throw new BadRequestException('La organización es requerida para consultar el inventario.');
        }

        // Fetch all required data
        const [datasets, dashboards, adjustments] = await Promise.all([
            this.fetchDatasets(ownerId, organizationId),
            this.fetchDashboards(ownerId, organizationId),
            this.fetchAdjustments(ownerId, organizationId),
        ]);

        // Create adjustment lookup map
        const adjustmentMap = new Map<string, number>();
        adjustments.forEach(adj => {
            adjustmentMap.set(adj.dataset_id, adj.adjustment);
        });

        // Build inventory records
        const records: InventoryRecord[] = datasets.map(dataset => {
            const adjustment = adjustmentMap.get(dataset.id) ?? 0;
            const baseUnits = dataset.row_count ?? 0;
            const total = baseUnits + adjustment;

            // Find linked dashboards
            const linkedDashboards = dashboards.filter(dashboard =>
                dashboard.dataset_ids?.includes(dataset.id)
            );

            return {
                dataset: {
                    id: dataset.id,
                    name: dataset.name,
                    status: dataset.status,
                    rowCount: baseUnits,
                    updatedAt: dataset.updated_at,
                    tags: dataset.tags ?? [],
                },
                dashboards: linkedDashboards.map(dashboard => ({
                    id: dashboard.id,
                    name: dashboard.name,
                    updatedAt: dashboard.updated_at,
                })),
                adjustment,
                total,
            };
        });

        // Calculate totals
        const totals = {
            baseUnits: records.reduce((sum, record) => sum + record.dataset.rowCount, 0),
            adjustedUnits: records.reduce((sum, record) => sum + record.total, 0),
            datasetsWithAlerts: records.filter(record => record.total < 0).length,
            dashboardsLinked: dashboards.length,
        };

        // Get analytics overview if available
        let overview: OverviewAnalytics | null = null;
        try {
            overview = await this.analyticsService.getOverview(ownerId);
        } catch (error) {
            // Analytics might not be available, continue without it
            console.warn('Could not fetch analytics overview:', error);
        }

        return {
            overview,
            totals,
            records,
        };
    }

    async adjustInventory(
        ownerId: string,
        datasetId: string,
        amount: number,
        userRole: UserRole = UserRole.User,
        organizationId?: string,
    ): Promise<InventorySummary> {
        if (userRole === UserRole.SuperAdmin) {
            throw new ForbiddenException('El superadmin no puede ajustar inventario.');
        }

        if (!organizationId) {
            throw new BadRequestException('La organización es requerida para ajustar inventario.');
        }

        if (!Number.isFinite(amount) || amount === 0) {
            throw new BadRequestException('El ajuste de inventario debe ser un entero distinto de cero.');
        }

        await this.ensureDatasetOwnership(ownerId, datasetId, organizationId);

        const current = await this.fetchAdjustment(ownerId, datasetId, organizationId);
        const nextValue = (current?.adjustment ?? 0) + amount;

        if (nextValue === 0) {
            const { error } = await this.supabase
                .from(this.inventoryTable)
                .delete()
                .eq('owner_id', ownerId)
                .eq('dataset_id', datasetId)
                .eq('organization_id', organizationId);

            if (error) {
                throw new InternalServerErrorException('No se pudo actualizar el inventario.');
            }
        } else {
            const { error } = await this.supabase
                .from(this.inventoryTable)
                .upsert({
                    owner_id: ownerId,
                    organization_id: organizationId,
                    dataset_id: datasetId,
                    adjustment: nextValue,
                }, { onConflict: 'owner_id,dataset_id,organization_id' });

            if (error) {
                throw new InternalServerErrorException('No se pudo actualizar el inventario.');
            }
        }

        return this.getInventory(ownerId, userRole, organizationId);
    }

    async resetAdjustments(ownerId: string, userRole: UserRole = UserRole.User, organizationId?: string): Promise<InventorySummary> {
        if (userRole === UserRole.SuperAdmin) {
            throw new ForbiddenException('El superadmin no puede reiniciar ajustes de inventario.');
        }

        if (!organizationId) {
            throw new BadRequestException('La organización es requerida para reiniciar ajustes.');
        }

        const { error } = await this.supabase
            .from(this.inventoryTable)
            .delete()
            .eq('owner_id', ownerId)
            .eq('organization_id', organizationId);

        if (error) {
            throw new InternalServerErrorException('No se pudo reiniciar los ajustes de inventario.');
        }

        return this.getInventory(ownerId, userRole, organizationId);
    }

    private async fetchDatasets(ownerId: string, organizationId?: string): Promise<DatasetRow[]> {
        let query = this.supabase
            .from(this.datasetsTable)
            .select('id, owner_id, name, status, row_count, updated_at, tags')
            .eq('owner_id', ownerId);

        if (organizationId) {
            query = query.eq('organization_id', organizationId);
        }

        const { data, error } = await query;

        if (error) {
            throw new InternalServerErrorException('No se pudieron leer los datasets desde Supabase.');
        }

        return (data ?? []) as DatasetRow[];
    }

    private async fetchDashboards(ownerId: string, organizationId?: string): Promise<DashboardRow[]> {
        let query = this.supabase
            .from(this.dashboardsTable)
            .select('id, owner_id, name, dataset_ids, updated_at')
            .eq('owner_id', ownerId);

        if (organizationId) {
            query = query.eq('organization_id', organizationId);
        }

        const { data, error } = await query;

        if (error) {
            throw new InternalServerErrorException('No se pudieron leer los dashboards desde Supabase.');
        }

        return (data ?? []) as DashboardRow[];
    }

    private async fetchAdjustments(ownerId: string, organizationId?: string): Promise<InventoryAdjustmentRow[]> {
        let query = this.supabase
            .from(this.inventoryTable)
            .select('dataset_id, owner_id, adjustment, updated_at')
            .eq('owner_id', ownerId);

        if (organizationId) {
            query = query.eq('organization_id', organizationId);
        }

        const { data, error } = await query;

        if (error) {
            throw new InternalServerErrorException('No se pudieron leer los ajustes de inventario desde Supabase.');
        }

        return (data ?? []) as InventoryAdjustmentRow[];
    }

    private async fetchAdjustment(ownerId: string, datasetId: string, organizationId?: string): Promise<InventoryAdjustmentRow | null> {
        let query = this.supabase
            .from(this.inventoryTable)
            .select('dataset_id, owner_id, adjustment, updated_at')
            .eq('owner_id', ownerId)
            .eq('dataset_id', datasetId);

        if (organizationId) {
            query = query.eq('organization_id', organizationId);
        }

        const { data, error } = await query.maybeSingle();

        if (error) {
            throw new InternalServerErrorException('No se pudo leer el ajuste actual de inventario.');
        }

        return (data as InventoryAdjustmentRow | null) ?? null;
    }

    private async ensureDatasetOwnership(ownerId: string, datasetId: string, organizationId?: string): Promise<void> {
        let query = this.supabase
            .from(this.datasetsTable)
            .select('id')
            .eq('id', datasetId)
            .eq('owner_id', ownerId);

        if (organizationId) {
            query = query.eq('organization_id', organizationId);
        }

        const { data, error } = await query.maybeSingle();

        if (error) {
            throw new InternalServerErrorException('No se pudo validar el dataset en Supabase.');
        }

        if (!data) {
            throw new NotFoundException('El dataset indicado no existe o no pertenece a tu cuenta.');
        }
    }

    private async ensureDashboardOwnership(ownerId: string, dashboardId: string, organizationId?: string): Promise<void> {
        let query = this.supabase
            .from(this.dashboardsTable)
            .select('id')
            .eq('id', dashboardId)
            .eq('owner_id', ownerId);

        if (organizationId) {
            query = query.eq('organization_id', organizationId);
        }

        const { data, error } = await query.maybeSingle();

        if (error) {
            throw new InternalServerErrorException('No se pudo validar el dashboard en Supabase.');
        }

        if (!data) {
            throw new NotFoundException('El dashboard indicado no existe o no pertenece a tu cuenta.');
        }
    }

    private buildRecords(
        datasets: DatasetRow[],
        dashboards: DashboardRow[],
        adjustments: InventoryAdjustmentRow[],
    ): InventoryRecord[] {
        const adjustmentMap = new Map<string, number>();
        adjustments.forEach((row) => {
            adjustmentMap.set(row.dataset_id, row.adjustment);
        });

        const dashboardMap = new Map<string, InventoryDashboardSummary[]>();
        dashboards.forEach((dashboard) => {
            const targets = dashboard.dataset_ids ?? [];
            targets.forEach((datasetId) => {
                const list = dashboardMap.get(datasetId) ?? [];
                list.push({
                    id: dashboard.id,
                    name: dashboard.name,
                    updatedAt: dashboard.updated_at,
                });
                dashboardMap.set(datasetId, list);
            });
        });

        return datasets.map((dataset) => {
            const baseCount = dataset.row_count ?? 0;
            const adjustment = adjustmentMap.get(dataset.id) ?? 0;
            const total = baseCount + adjustment;

            return {
                dataset: {
                    id: dataset.id,
                    name: dataset.name,
                    status: dataset.status,
                    rowCount: baseCount,
                    updatedAt: dataset.updated_at,
                    tags: dataset.tags ?? [],
                },
                dashboards: dashboardMap.get(dataset.id) ?? [],
                adjustment,
                total,
            };
        });
    }

    private buildTotals(records: InventoryRecord[], dashboardCount: number) {
        const baseUnits = records.reduce((acc, record) => acc + record.dataset.rowCount, 0);
        const adjustedUnits = records.reduce((acc, record) => acc + record.total, 0);
        const datasetsWithAlerts = records.filter((record) => record.dataset.status !== 'processed').length;

        return {
            baseUnits,
            adjustedUnits,
            datasetsWithAlerts,
            dashboardsLinked: dashboardCount,
        };
    }

    // Inventory Items CRUD
    async createItem(
        ownerId: string,
        dto: CreateInventoryItemDto,
        userRole: UserRole = UserRole.User,
        organizationId?: string,
    ): Promise<InventoryItem> {
        if (userRole === UserRole.SuperAdmin) {
            throw new ForbiddenException('El superadmin no puede crear items de inventario.');
        }

        if (!organizationId) {
            throw new BadRequestException('La organización es requerida para crear items de inventario.');
        }

        console.log('Creating inventory item for ownerId:', ownerId, 'dto:', dto);
        // Validate dataset/dashboard ownership if provided
        if (dto.datasetId) {
            await this.ensureDatasetOwnership(ownerId, dto.datasetId, organizationId);
        }
        if (dto.dashboardId) {
            await this.ensureDashboardOwnership(ownerId, dto.dashboardId, organizationId);
        }

        // All items start as pending, regardless of user role
        const initialStatus = 'pending';

        const { data, error } = await this.supabase
            .from(this.itemsTable)
            .insert({
                owner_id: ownerId,
                organization_id: organizationId,
                dataset_id: dto.datasetId || null,
                dashboard_id: dto.dashboardId || null,
                name: dto.name,
                code: dto.code,
                quantity: dto.quantity,
                pvp: dto.pvp,
                cost: dto.cost,
                status: initialStatus,
                approved_by: null,
                approved_at: null,
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating inventory item:', error);
            if (error.code === '23505') {
                throw new BadRequestException('El código ya existe');
            }
            throw new InternalServerErrorException(`No se pudo crear el item de inventario: ${error.message}`);
        }

        return this.mapToInventoryItem(data as InventoryItemRow);
    }

    async getItems(ownerId: string, userRole: UserRole = UserRole.User, organizationId?: string): Promise<InventoryItem[]> {
        if (userRole === UserRole.SuperAdmin) {
            throw new ForbiddenException('El superadmin no puede consultar items de inventario.');
        }

        console.log('getItems called with ownerId:', ownerId, 'userRole:', userRole, 'organizationId:', organizationId);

        let query = this.supabase
            .from(this.itemsTable)
            .select('*')
            .order('created_at', { ascending: false });

        const isAdmin = userRole === UserRole.Admin;

        // Filter based on user role and organization
        if (isAdmin) {
            if (!organizationId) {
                throw new BadRequestException('La organización es requerida para consultar el inventario como administrador.');
            }
            query = query.eq('organization_id', organizationId);
            console.log('User is admin, enforcing organization filter:', organizationId);
        } else {
            console.log('User is regular user, filtering by owner_id:', ownerId);
            query = query.eq('owner_id', ownerId);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching items:', error);
            throw new InternalServerErrorException('No se pudieron obtener los items de inventario');
        }

        console.log('Items fetched:', data?.length || 0, 'items');
        return (data as InventoryItemRow[]).map(row => this.mapToInventoryItem(row));
    }

    async getItem(ownerId: string, itemId: string, userRole: UserRole = UserRole.User, organizationId?: string): Promise<InventoryItem> {
        if (userRole === UserRole.SuperAdmin) {
            throw new ForbiddenException('El superadmin no puede consultar items de inventario.');
        }

        let query = this.supabase
            .from(this.itemsTable)
            .select('*')
            .eq('id', itemId);

        const isAdmin = userRole === UserRole.Admin;

        if (isAdmin) {
            if (!organizationId) {
                throw new BadRequestException('La organización es requerida para consultar items como administrador.');
            }
            query = query.eq('organization_id', organizationId);
        } else {
            query = query.eq('owner_id', ownerId);
        }

        const { data, error } = await query.single();

        if (error || !data) {
            throw new NotFoundException('Item de inventario no encontrado');
        }

        return this.mapToInventoryItem(data as InventoryItemRow);
    }

    async updateItem(
        ownerId: string,
        itemId: string,
        dto: UpdateInventoryItemDto,
        userRole: UserRole = UserRole.User,
        organizationId?: string,
    ): Promise<InventoryItem> {
        if (userRole === UserRole.SuperAdmin) {
            throw new ForbiddenException('El superadmin no puede actualizar items de inventario.');
        }

        const isAdmin = userRole === UserRole.Admin;

        if (!organizationId) {
            throw new BadRequestException('La organización es requerida para actualizar items de inventario.');
        }

        // Validate ownership first
        await this.getItem(ownerId, itemId, userRole, organizationId);

        // Validate new dataset/dashboard ownership if provided
        if (dto.datasetId) {
            await this.ensureDatasetOwnership(ownerId, dto.datasetId, organizationId);
        }
        if (dto.dashboardId) {
            await this.ensureDashboardOwnership(ownerId, dto.dashboardId, organizationId);
        }

        const updateData: Record<string, unknown> = {};
        if (dto.name !== undefined) updateData.name = dto.name;
        if (dto.code !== undefined) updateData.code = dto.code;
        if (dto.quantity !== undefined) updateData.quantity = dto.quantity;
        if (dto.pvp !== undefined) updateData.pvp = dto.pvp;
        if (dto.cost !== undefined) updateData.cost = dto.cost;
        if (dto.datasetId !== undefined) updateData.dataset_id = dto.datasetId;
        if (dto.dashboardId !== undefined) updateData.dashboard_id = dto.dashboardId;

        let query = this.supabase
            .from(this.itemsTable)
            .update(updateData)
            .eq('id', itemId);

        if (isAdmin) {
            query = query.eq('organization_id', organizationId);
        } else {
            query = query.eq('owner_id', ownerId);
        }

        const { data, error } = await query.select().single();

        if (error) {
            if (error.code === '23505') {
                throw new BadRequestException('El código ya existe');
            }
            throw new InternalServerErrorException('No se pudo actualizar el item de inventario');
        }

        return this.mapToInventoryItem(data as InventoryItemRow);
    }

    async approveItem(
        ownerId: string,
        itemId: string,
        status: 'approved' | 'rejected',
        userRole: UserRole = UserRole.User,
        organizationId?: string,
    ): Promise<InventoryItem> {
        if (userRole === UserRole.SuperAdmin) {
            throw new ForbiddenException('El superadmin no puede aprobar items de inventario.');
        }

        let query = this.supabase
            .from(this.itemsTable)
            .update({
                status,
                approved_by: ownerId,
                approved_at: new Date().toISOString(),
            })
            .eq('id', itemId);

        const isAdmin = userRole === UserRole.Admin;

        if (isAdmin) {
            if (!organizationId) {
                throw new BadRequestException('La organización es requerida para aprobar items como administrador.');
            }
            query = query.eq('organization_id', organizationId);
        }

        const { data, error } = await query.select().single();

        if (error) {
            throw new InternalServerErrorException('No se pudo actualizar el estado del item de inventario');
        }

        return this.mapToInventoryItem(data as InventoryItemRow);
    }

    async deleteItem(ownerId: string, itemId: string, userRole: UserRole = UserRole.User, organizationId?: string): Promise<void> {
        if (userRole === UserRole.SuperAdmin) {
            throw new ForbiddenException('El superadmin no puede eliminar items de inventario.');
        }

        let query = this.supabase
            .from(this.itemsTable)
            .delete()
            .eq('id', itemId);

        const isAdmin = userRole === UserRole.Admin;

        if (isAdmin) {
            if (!organizationId) {
                throw new BadRequestException('La organización es requerida para eliminar items como administrador.');
            }
            query = query.eq('organization_id', organizationId);
        } else {
            query = query.eq('owner_id', ownerId);
        }

        const { error } = await query;

        if (error) {
            throw new InternalServerErrorException('No se pudo eliminar el item de inventario');
        }
    }

    private mapToInventoryItem(row: InventoryItemRow): InventoryItem {
        return {
            id: row.id,
            ownerId: row.owner_id,
            datasetId: row.dataset_id,
            dashboardId: row.dashboard_id,
            name: row.name,
            code: row.code,
            quantity: row.quantity,
            pvp: row.pvp,
            cost: row.cost,
            status: row.status,
            approvedBy: row.approved_by,
            approvedAt: row.approved_at,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }

    private async safeGetOverview(ownerId: string): Promise<OverviewAnalytics | null> {
        try {
            return await this.analyticsService.getOverview(ownerId);
        } catch (error) {
            // If analytics fails we still want inventory to load.
            // eslint-disable-next-line no-console
            console.warn('Failed to fetch analytics overview for inventory view:', error);
            return null;
        }
    }
}
