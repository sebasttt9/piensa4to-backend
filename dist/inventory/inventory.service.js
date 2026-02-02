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
exports.InventoryService = void 0;
const common_1 = require("@nestjs/common");
const supabase_js_1 = require("@supabase/supabase-js");
const supabase_constants_1 = require("../database/supabase.constants");
const analytics_service_1 = require("../analytics/analytics.service");
const roles_enum_1 = require("../common/constants/roles.enum");
let InventoryService = class InventoryService {
    supabase;
    analyticsService;
    inventoryTable = 'inventory_adjustments';
    itemsTable = 'inventory_items';
    datasetsTable = 'datasets';
    dashboardsTable = 'dashboards';
    constructor(supabase, analyticsService) {
        this.supabase = supabase;
        this.analyticsService = analyticsService;
    }
    async getInventory(ownerId, userRole = roles_enum_1.UserRole.User, organizationId) {
        if (userRole === roles_enum_1.UserRole.SuperAdmin) {
            throw new common_1.ForbiddenException('El superadmin no puede consultar inventario.');
        }
        if (!organizationId) {
            throw new common_1.BadRequestException('La organización es requerida para consultar el inventario.');
        }
        const [datasets, dashboards, adjustments] = await Promise.all([
            this.fetchDatasets(ownerId, organizationId),
            this.fetchDashboards(ownerId, organizationId),
            this.fetchAdjustments(ownerId, organizationId),
        ]);
        const adjustmentMap = new Map();
        adjustments.forEach(adj => {
            adjustmentMap.set(adj.dataset_id, adj.adjustment);
        });
        const records = datasets.map(dataset => {
            const adjustment = adjustmentMap.get(dataset.id) ?? 0;
            const baseUnits = dataset.row_count ?? 0;
            const total = baseUnits + adjustment;
            const linkedDashboards = dashboards.filter(dashboard => dashboard.dataset_ids?.includes(dataset.id));
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
        const totals = {
            baseUnits: records.reduce((sum, record) => sum + record.dataset.rowCount, 0),
            adjustedUnits: records.reduce((sum, record) => sum + record.total, 0),
            datasetsWithAlerts: records.filter(record => record.total < 0).length,
            dashboardsLinked: dashboards.length,
        };
        let overview = null;
        try {
            overview = await this.analyticsService.getOverview(ownerId);
        }
        catch (error) {
            console.warn('Could not fetch analytics overview:', error);
        }
        return {
            overview,
            totals,
            records,
        };
    }
    async adjustInventory(ownerId, datasetId, amount, userRole = roles_enum_1.UserRole.User, organizationId) {
        if (userRole === roles_enum_1.UserRole.SuperAdmin) {
            throw new common_1.ForbiddenException('El superadmin no puede ajustar inventario.');
        }
        if (!organizationId) {
            throw new common_1.BadRequestException('La organización es requerida para ajustar inventario.');
        }
        if (!Number.isFinite(amount) || amount === 0) {
            throw new common_1.BadRequestException('El ajuste de inventario debe ser un entero distinto de cero.');
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
                throw new common_1.InternalServerErrorException('No se pudo actualizar el inventario.');
            }
        }
        else {
            const { error } = await this.supabase
                .from(this.inventoryTable)
                .upsert({
                owner_id: ownerId,
                organization_id: organizationId,
                dataset_id: datasetId,
                adjustment: nextValue,
            }, { onConflict: 'owner_id,dataset_id,organization_id' });
            if (error) {
                throw new common_1.InternalServerErrorException('No se pudo actualizar el inventario.');
            }
        }
        return this.getInventory(ownerId, userRole, organizationId);
    }
    async resetAdjustments(ownerId, userRole = roles_enum_1.UserRole.User, organizationId) {
        if (userRole === roles_enum_1.UserRole.SuperAdmin) {
            throw new common_1.ForbiddenException('El superadmin no puede reiniciar ajustes de inventario.');
        }
        if (!organizationId) {
            throw new common_1.BadRequestException('La organización es requerida para reiniciar ajustes.');
        }
        const { error } = await this.supabase
            .from(this.inventoryTable)
            .delete()
            .eq('owner_id', ownerId)
            .eq('organization_id', organizationId);
        if (error) {
            throw new common_1.InternalServerErrorException('No se pudo reiniciar los ajustes de inventario.');
        }
        return this.getInventory(ownerId, userRole, organizationId);
    }
    async fetchDatasets(ownerId, organizationId) {
        let query = this.supabase
            .from(this.datasetsTable)
            .select('id, owner_id, name, status, row_count, updated_at, tags')
            .eq('owner_id', ownerId);
        if (organizationId) {
            query = query.eq('organization_id', organizationId);
        }
        const { data, error } = await query;
        if (error) {
            throw new common_1.InternalServerErrorException('No se pudieron leer los datasets desde Supabase.');
        }
        return (data ?? []);
    }
    async fetchDashboards(ownerId, organizationId) {
        let query = this.supabase
            .from(this.dashboardsTable)
            .select('id, owner_id, name, dataset_ids, updated_at')
            .eq('owner_id', ownerId);
        if (organizationId) {
            query = query.eq('organization_id', organizationId);
        }
        const { data, error } = await query;
        if (error) {
            throw new common_1.InternalServerErrorException('No se pudieron leer los dashboards desde Supabase.');
        }
        return (data ?? []);
    }
    async fetchAdjustments(ownerId, organizationId) {
        let query = this.supabase
            .from(this.inventoryTable)
            .select('dataset_id, owner_id, adjustment, updated_at')
            .eq('owner_id', ownerId);
        if (organizationId) {
            query = query.eq('organization_id', organizationId);
        }
        const { data, error } = await query;
        if (error) {
            throw new common_1.InternalServerErrorException('No se pudieron leer los ajustes de inventario desde Supabase.');
        }
        return (data ?? []);
    }
    async fetchAdjustment(ownerId, datasetId, organizationId) {
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
            throw new common_1.InternalServerErrorException('No se pudo leer el ajuste actual de inventario.');
        }
        return data ?? null;
    }
    async ensureDatasetOwnership(ownerId, datasetId, organizationId) {
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
            throw new common_1.InternalServerErrorException('No se pudo validar el dataset en Supabase.');
        }
        if (!data) {
            throw new common_1.NotFoundException('El dataset indicado no existe o no pertenece a tu cuenta.');
        }
    }
    async ensureDashboardOwnership(ownerId, dashboardId, organizationId) {
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
            throw new common_1.InternalServerErrorException('No se pudo validar el dashboard en Supabase.');
        }
        if (!data) {
            throw new common_1.NotFoundException('El dashboard indicado no existe o no pertenece a tu cuenta.');
        }
    }
    buildRecords(datasets, dashboards, adjustments) {
        const adjustmentMap = new Map();
        adjustments.forEach((row) => {
            adjustmentMap.set(row.dataset_id, row.adjustment);
        });
        const dashboardMap = new Map();
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
    buildTotals(records, dashboardCount) {
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
    async createItem(ownerId, dto, userRole = roles_enum_1.UserRole.User, organizationId) {
        if (userRole === roles_enum_1.UserRole.SuperAdmin) {
            throw new common_1.ForbiddenException('El superadmin no puede crear items de inventario.');
        }
        if (!organizationId) {
            throw new common_1.BadRequestException('La organización es requerida para crear items de inventario.');
        }
        console.log('Creating inventory item for ownerId:', ownerId, 'dto:', dto);
        if (dto.datasetId) {
            await this.ensureDatasetOwnership(ownerId, dto.datasetId, organizationId);
        }
        if (dto.dashboardId) {
            await this.ensureDashboardOwnership(ownerId, dto.dashboardId, organizationId);
        }
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
                throw new common_1.BadRequestException('El código ya existe');
            }
            throw new common_1.InternalServerErrorException(`No se pudo crear el item de inventario: ${error.message}`);
        }
        return this.mapToInventoryItem(data);
    }
    async getItems(ownerId, userRole = roles_enum_1.UserRole.User, organizationId) {
        if (userRole === roles_enum_1.UserRole.SuperAdmin) {
            throw new common_1.ForbiddenException('El superadmin no puede consultar items de inventario.');
        }
        console.log('getItems called with ownerId:', ownerId, 'userRole:', userRole, 'organizationId:', organizationId);
        let query = this.supabase
            .from(this.itemsTable)
            .select('*')
            .order('created_at', { ascending: false });
        const isAdmin = userRole === roles_enum_1.UserRole.Admin;
        if (isAdmin) {
            if (!organizationId) {
                throw new common_1.BadRequestException('La organización es requerida para consultar el inventario como administrador.');
            }
            query = query.eq('organization_id', organizationId);
            console.log('User is admin, enforcing organization filter:', organizationId);
        }
        else {
            console.log('User is regular user, filtering by owner_id:', ownerId);
            query = query.eq('owner_id', ownerId);
        }
        const { data, error } = await query;
        if (error) {
            console.error('Error fetching items:', error);
            throw new common_1.InternalServerErrorException('No se pudieron obtener los items de inventario');
        }
        console.log('Items fetched:', data?.length || 0, 'items');
        return data.map(row => this.mapToInventoryItem(row));
    }
    async getItem(ownerId, itemId, userRole = roles_enum_1.UserRole.User, organizationId) {
        if (userRole === roles_enum_1.UserRole.SuperAdmin) {
            throw new common_1.ForbiddenException('El superadmin no puede consultar items de inventario.');
        }
        let query = this.supabase
            .from(this.itemsTable)
            .select('*')
            .eq('id', itemId);
        const isAdmin = userRole === roles_enum_1.UserRole.Admin;
        if (isAdmin) {
            if (!organizationId) {
                throw new common_1.BadRequestException('La organización es requerida para consultar items como administrador.');
            }
            query = query.eq('organization_id', organizationId);
        }
        else {
            query = query.eq('owner_id', ownerId);
        }
        const { data, error } = await query.single();
        if (error || !data) {
            throw new common_1.NotFoundException('Item de inventario no encontrado');
        }
        return this.mapToInventoryItem(data);
    }
    async updateItem(ownerId, itemId, dto, userRole = roles_enum_1.UserRole.User, organizationId) {
        if (userRole === roles_enum_1.UserRole.SuperAdmin) {
            throw new common_1.ForbiddenException('El superadmin no puede actualizar items de inventario.');
        }
        const isAdmin = userRole === roles_enum_1.UserRole.Admin;
        if (!organizationId) {
            throw new common_1.BadRequestException('La organización es requerida para actualizar items de inventario.');
        }
        await this.getItem(ownerId, itemId, userRole, organizationId);
        if (dto.datasetId) {
            await this.ensureDatasetOwnership(ownerId, dto.datasetId, organizationId);
        }
        if (dto.dashboardId) {
            await this.ensureDashboardOwnership(ownerId, dto.dashboardId, organizationId);
        }
        const updateData = {};
        if (dto.name !== undefined)
            updateData.name = dto.name;
        if (dto.code !== undefined)
            updateData.code = dto.code;
        if (dto.quantity !== undefined)
            updateData.quantity = dto.quantity;
        if (dto.pvp !== undefined)
            updateData.pvp = dto.pvp;
        if (dto.cost !== undefined)
            updateData.cost = dto.cost;
        if (dto.datasetId !== undefined)
            updateData.dataset_id = dto.datasetId;
        if (dto.dashboardId !== undefined)
            updateData.dashboard_id = dto.dashboardId;
        let query = this.supabase
            .from(this.itemsTable)
            .update(updateData)
            .eq('id', itemId);
        if (isAdmin) {
            query = query.eq('organization_id', organizationId);
        }
        else {
            query = query.eq('owner_id', ownerId);
        }
        const { data, error } = await query.select().single();
        if (error) {
            if (error.code === '23505') {
                throw new common_1.BadRequestException('El código ya existe');
            }
            throw new common_1.InternalServerErrorException('No se pudo actualizar el item de inventario');
        }
        return this.mapToInventoryItem(data);
    }
    async approveItem(ownerId, itemId, status, userRole = roles_enum_1.UserRole.User, organizationId) {
        if (userRole === roles_enum_1.UserRole.SuperAdmin) {
            throw new common_1.ForbiddenException('El superadmin no puede aprobar items de inventario.');
        }
        let query = this.supabase
            .from(this.itemsTable)
            .update({
            status,
            approved_by: ownerId,
            approved_at: new Date().toISOString(),
        })
            .eq('id', itemId);
        const isAdmin = userRole === roles_enum_1.UserRole.Admin;
        if (isAdmin) {
            if (!organizationId) {
                throw new common_1.BadRequestException('La organización es requerida para aprobar items como administrador.');
            }
            query = query.eq('organization_id', organizationId);
        }
        const { data, error } = await query.select().single();
        if (error) {
            throw new common_1.InternalServerErrorException('No se pudo actualizar el estado del item de inventario');
        }
        return this.mapToInventoryItem(data);
    }
    async deleteItem(ownerId, itemId, userRole = roles_enum_1.UserRole.User, organizationId) {
        if (userRole === roles_enum_1.UserRole.SuperAdmin) {
            throw new common_1.ForbiddenException('El superadmin no puede eliminar items de inventario.');
        }
        let query = this.supabase
            .from(this.itemsTable)
            .delete()
            .eq('id', itemId);
        const isAdmin = userRole === roles_enum_1.UserRole.Admin;
        if (isAdmin) {
            if (!organizationId) {
                throw new common_1.BadRequestException('La organización es requerida para eliminar items como administrador.');
            }
            query = query.eq('organization_id', organizationId);
        }
        else {
            query = query.eq('owner_id', ownerId);
        }
        const { error } = await query;
        if (error) {
            throw new common_1.InternalServerErrorException('No se pudo eliminar el item de inventario');
        }
    }
    mapToInventoryItem(row) {
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
    async safeGetOverview(ownerId) {
        try {
            return await this.analyticsService.getOverview(ownerId);
        }
        catch (error) {
            console.warn('Failed to fetch analytics overview for inventory view:', error);
            return null;
        }
    }
};
exports.InventoryService = InventoryService;
exports.InventoryService = InventoryService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(supabase_constants_1.SUPABASE_DATA_CLIENT)),
    __metadata("design:paramtypes", [supabase_js_1.SupabaseClient,
        analytics_service_1.AnalyticsService])
], InventoryService);
//# sourceMappingURL=inventory.service.js.map