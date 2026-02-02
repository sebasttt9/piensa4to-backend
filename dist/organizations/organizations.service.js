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
exports.OrganizationsService = void 0;
const common_1 = require("@nestjs/common");
const supabase_js_1 = require("@supabase/supabase-js");
const supabase_constants_1 = require("../database/supabase.constants");
let OrganizationsService = class OrganizationsService {
    supabase;
    supabaseData;
    constructor(supabase, supabaseData) {
        this.supabase = supabase;
        this.supabaseData = supabaseData;
    }
    tableName = 'organizations';
    supportsExtendedColumns = true;
    async create(dto) {
        const buildPayload = (includeExtended) => {
            const payload = {
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
            throw new common_1.InternalServerErrorException('No se pudo crear la organización');
        }
        return this.toEntity(data);
    }
    async findAll() {
        const { data, error } = await this.supabase
            .from(this.tableName)
            .select('*')
            .order('created_at', { ascending: false });
        if (error) {
            console.error('Supabase error listando organizaciones', error);
            throw new common_1.InternalServerErrorException('No se pudieron listar las organizaciones');
        }
        return data.map(row => this.toEntity(row));
    }
    async findOne(id) {
        const { data, error } = await this.supabase
            .from(this.tableName)
            .select('*')
            .eq('id', id)
            .single();
        if (error || !data) {
            if (error) {
                console.error('Supabase error obteniendo organización', error);
            }
            throw new common_1.NotFoundException('Organización no encontrada');
        }
        return this.toEntity(data);
    }
    async update(id, dto) {
        const buildPayload = (includeExtended) => {
            const payload = {};
            if (dto.name !== undefined)
                payload.name = dto.name;
            if (dto.description !== undefined)
                payload.description = dto.description ?? null;
            if (dto.owner !== undefined)
                payload.owner = dto.owner ?? null;
            if (dto.ciRuc !== undefined)
                payload.ci_ruc = dto.ciRuc ?? null;
            if (includeExtended) {
                if (dto.location !== undefined)
                    payload.location = dto.location ?? null;
                if (dto.businessEmail !== undefined)
                    payload.business_email = dto.businessEmail ?? null;
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
            throw new common_1.NotFoundException('Organización no encontrada');
        }
        return this.toEntity(data);
    }
    async remove(id) {
        await this.execRequired(this.supabase
            .from('users')
            .update({ organization_id: null, updated_at: new Date().toISOString() })
            .eq('organization_id', id), 'users.clearOrganization');
        const { data: remainingUsers, error: remainingError } = await this.supabase
            .from('users')
            .select('id,email')
            .eq('organization_id', id);
        if (remainingError) {
            console.error('Supabase error verificando usuarios con organización antes de eliminarla', remainingError);
            throw new common_1.InternalServerErrorException('No se pudo verificar usuarios de la organización antes de eliminarla');
        }
        if ((remainingUsers ?? []).length > 0) {
            const sample = (remainingUsers ?? []).slice(0, 5).map((u) => u.email ?? u.id);
            throw new common_1.ConflictException(`La organización aún tiene usuarios asignados (${(remainingUsers ?? []).length}). Quita a los usuarios antes de eliminarla. Ejemplos: ${sample.join(', ')}`);
        }
        const dashboardIds = await this.collectIds(this.supabaseData
            .from('dashboards')
            .select('id')
            .eq('organization_id', id), 'dashboards.fetchIds');
        if (dashboardIds.length > 0) {
            await this.execSafe(this.supabaseData
                .from('dashboard_datasets')
                .delete()
                .in('dashboard_id', dashboardIds), 'dashboard_datasets.removeByDashboard');
            await this.execSafe(this.supabaseData
                .from('dashboard_shares')
                .delete()
                .in('dashboard_id', dashboardIds), 'dashboard_shares.removeByDashboard');
        }
        await this.execSafe(this.supabaseData
            .from('issues')
            .delete()
            .eq('organization_id', id), 'issues.removeByOrganization');
        await this.execSafe(this.supabaseData
            .from('inventory_adjustments')
            .delete()
            .eq('organization_id', id), 'inventory_adjustments.removeByOrganization');
        await this.execSafe(this.supabaseData
            .from('sales_order_items')
            .delete()
            .eq('organization_id', id), 'sales_order_items.removeByOrganization');
        await this.execSafe(this.supabaseData
            .from('sales_orders')
            .delete()
            .eq('organization_id', id), 'sales_orders.removeByOrganization');
        await this.execSafe(this.supabaseData
            .from('inventory_items')
            .delete()
            .eq('organization_id', id), 'inventory_items.removeByOrganization');
        await this.execSafe(this.supabaseData
            .from('datasets')
            .delete()
            .eq('organization_id', id), 'datasets.removeByOrganization');
        await this.execSafe(this.supabaseData
            .from('dashboards')
            .delete()
            .eq('organization_id', id), 'dashboards.removeByOrganization');
        const { error } = await this.supabase
            .from(this.tableName)
            .delete()
            .eq('id', id);
        if (error) {
            console.error('Supabase error eliminando organización', error);
            throw new common_1.InternalServerErrorException('No se pudo eliminar la organización');
        }
    }
    async collectIds(operation, context) {
        try {
            const { data, error } = await operation;
            if (error && !this.isIgnorableCleanupError(error)) {
                console.warn(`No se pudieron recopilar IDs (${context}):`, error);
                return [];
            }
            return (data ?? []).map((row) => row.id);
        }
        catch (error) {
            console.warn(`Fallo inesperado recopilando IDs (${context}):`, error);
            return [];
        }
    }
    async execSafe(operation, context) {
        try {
            const { error } = await operation;
            if (error && !this.isIgnorableCleanupError(error)) {
                console.warn(`No se pudo limpiar completamente (${context}).`, error);
            }
        }
        catch (error) {
            console.warn(`Fallo inesperado durante la limpieza (${context}).`, error);
        }
    }
    async execRequired(operation, context) {
        const { error } = await operation;
        if (error) {
            console.error(`Error crítico durante la limpieza (${context}).`, error);
            throw new common_1.InternalServerErrorException('No se pudo preparar la eliminación de la organización (limpieza de usuarios)');
        }
    }
    isIgnorableCleanupError(error) {
        if (!error)
            return true;
        const ignorable = new Set([
            'PGRST116',
            '42P01',
            '42703',
            '42501',
        ]);
        return ignorable.has(error.code ?? '');
    }
    toEntity(row) {
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
    shouldDowngradeOrgColumns(error) {
        if (!error || typeof error !== 'object') {
            return false;
        }
        const code = error.code;
        return code === '42703' || code === 'PGRST204';
    }
};
exports.OrganizationsService = OrganizationsService;
exports.OrganizationsService = OrganizationsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(supabase_constants_1.SUPABASE_CLIENT)),
    __param(1, (0, common_1.Inject)(supabase_constants_1.SUPABASE_DATA_CLIENT)),
    __metadata("design:paramtypes", [supabase_js_1.SupabaseClient,
        supabase_js_1.SupabaseClient])
], OrganizationsService);
//# sourceMappingURL=organizations.service.js.map