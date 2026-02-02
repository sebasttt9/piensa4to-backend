"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const bcrypt = __importStar(require("bcrypt"));
const roles_enum_1 = require("../common/constants/roles.enum");
const supabase_constants_1 = require("../database/supabase.constants");
const supabase_js_1 = require("@supabase/supabase-js");
let UsersService = class UsersService {
    supabase;
    supabaseData;
    constructor(supabase, supabaseData) {
        this.supabase = supabase;
        this.supabaseData = supabaseData;
    }
    tableName = 'users';
    async create(createUserDto) {
        try {
            const email = createUserDto.email.toLowerCase();
            const existing = await this.findByEmail(email);
            if (existing) {
                throw new common_1.ConflictException('El correo ya está registrado');
            }
            const hashedPassword = await bcrypt.hash(createUserDto.password, 12);
            const { data, error } = await this.supabase
                .from(this.tableName)
                .insert({
                email,
                name: createUserDto.name,
                role: createUserDto.role ?? roles_enum_1.UserRole.User,
                password_hash: hashedPassword,
                approved: createUserDto.role === roles_enum_1.UserRole.SuperAdmin ? true : false,
                organization_id: createUserDto.organizationId ?? null,
            })
                .select()
                .single();
            if (error) {
                console.error('Error de Supabase al insertar usuario:', error);
                if (error.code === '23505') {
                    throw new common_1.ConflictException('El correo ya está registrado');
                }
                throw new common_1.InternalServerErrorException('No se pudo crear el usuario');
            }
            if (!data) {
                throw new common_1.InternalServerErrorException('No se pudo crear el usuario');
            }
            return this.toUserEntity(data);
        }
        catch (error) {
            console.error('Error creando usuario:', error);
            console.error('Detalles del error:', error.message, error.details, error.hint);
            throw new common_1.InternalServerErrorException('No se pudo crear el usuario');
        }
    }
    async findAll() {
        const { data, error } = await this.supabase
            .from(this.tableName)
            .select('*')
            .order('created_at', { ascending: false });
        if (error) {
            throw new common_1.InternalServerErrorException('No se pudieron listar los usuarios');
        }
        return (data ?? []).map((row) => this.toPublicUser(row));
    }
    async findById(id) {
        const { data, error } = await this.supabase
            .from(this.tableName)
            .select('*')
            .eq('id', id)
            .maybeSingle();
        if (error) {
            throw new common_1.InternalServerErrorException('No se pudo obtener el usuario');
        }
        if (!data) {
            throw new common_1.NotFoundException('Usuario no encontrado');
        }
        return this.toPublicUser(data);
    }
    async findByEmail(email) {
        const { data, error } = await this.supabase
            .from(this.tableName)
            .select('*')
            .eq('email', email.toLowerCase())
            .maybeSingle();
        if (error) {
            throw new common_1.InternalServerErrorException('No se pudo consultar el usuario');
        }
        if (!data) {
            return null;
        }
        return this.toUserEntity(data);
    }
    async update(id, changes) {
        if (changes.email) {
            const existing = await this.supabase
                .from(this.tableName)
                .select('id')
                .eq('email', changes.email.toLowerCase())
                .neq('id', id)
                .maybeSingle();
            if (existing.data) {
                throw new common_1.ConflictException('El correo ya está registrado');
            }
            if (existing.error && existing.error.code !== 'PGRST116') {
                throw new common_1.InternalServerErrorException('No se pudo actualizar el usuario');
            }
        }
        const updatePayload = {};
        if (changes.email) {
            updatePayload.email = changes.email.toLowerCase();
        }
        if (changes.password) {
            updatePayload.password_hash = await bcrypt.hash(changes.password, 12);
        }
        if (changes.name) {
            updatePayload.name = changes.name;
        }
        if (changes.role) {
            updatePayload.role = changes.role;
        }
        if (changes.approved !== undefined) {
            updatePayload.approved = changes.approved;
        }
        if (changes.organizationId !== undefined) {
            updatePayload.organization_id = changes.organizationId ?? null;
        }
        if (Object.keys(updatePayload).length === 0) {
            return this.findById(id);
        }
        const { data, error } = await this.supabase
            .from(this.tableName)
            .update({ ...updatePayload, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select('*')
            .maybeSingle();
        if (error) {
            throw new common_1.InternalServerErrorException('No se pudo actualizar el usuario');
        }
        if (!data) {
            throw new common_1.NotFoundException('Usuario no encontrado');
        }
        return this.toPublicUser(data);
    }
    async assignOrganization(id, dto) {
        const { data: existingUser, error: existingUserError } = await this.supabase
            .from(this.tableName)
            .select('role')
            .eq('id', id)
            .maybeSingle();
        if (existingUserError) {
            console.error('Supabase error fetching user before assignment:', existingUserError);
            throw new common_1.InternalServerErrorException('No se pudo verificar el usuario antes de asignar la organización');
        }
        if (!existingUser) {
            throw new common_1.NotFoundException('Usuario no encontrado');
        }
        const currentRole = existingUser.role ?? roles_enum_1.UserRole.User;
        const { data: primaryOrg, error: primaryError } = await this.supabase
            .from('organizations')
            .select('id, name, description, owner, ci_ruc, created_at, updated_at')
            .eq('id', dto.organizationId)
            .maybeSingle();
        if (primaryError && primaryError.code !== 'PGRST116') {
            console.error('Supabase error verifying organization assignment (primary DB):', primaryError);
            throw new common_1.InternalServerErrorException('No se pudo verificar la organización');
        }
        if (!primaryOrg) {
            const { data: dataOrg, error: dataError } = await this.supabaseData
                .from('organizations')
                .select('id, name, description, location, owner, ci_ruc, business_email, created_at, updated_at')
                .eq('id', dto.organizationId)
                .maybeSingle();
            if (dataError && dataError.code !== 'PGRST116') {
                console.error('Supabase error verifying organization assignment (datasets DB):', dataError);
                throw new common_1.InternalServerErrorException('No se pudo verificar la organización');
            }
            if (!dataOrg) {
                throw new common_1.NotFoundException('Organización no encontrada');
            }
            const record = dataOrg;
            const syncPayload = {
                id: record.id,
                name: record.name,
                description: record.description,
                owner: record.owner,
                ci_ruc: record.ci_ruc,
                created_at: record.created_at,
                updated_at: record.updated_at,
            };
            const { error: syncError } = await this.supabase
                .from('organizations')
                .upsert(syncPayload);
            if (syncError) {
                console.error('Supabase error syncing organization into primary DB:', syncError);
                throw new common_1.InternalServerErrorException('No se pudo sincronizar la organización seleccionada');
            }
        }
        const approve = dto.approve ?? (dto.makeAdmin ? true : undefined);
        const updatePayload = {
            updated_at: new Date().toISOString(),
        };
        if (currentRole !== roles_enum_1.UserRole.SuperAdmin) {
            updatePayload.organization_id = dto.organizationId;
        }
        if (dto.makeAdmin && currentRole !== roles_enum_1.UserRole.SuperAdmin) {
            updatePayload.role = roles_enum_1.UserRole.Admin;
        }
        if (approve !== undefined) {
            updatePayload.approved = approve;
        }
        const { data, error } = await this.supabase
            .from(this.tableName)
            .update(updatePayload)
            .eq('id', id)
            .select('*')
            .maybeSingle();
        if (error) {
            if (error.code === '23503') {
                throw new common_1.BadRequestException('La organización seleccionada no existe o fue eliminada. Vuelve a crearla antes de asignar usuarios.');
            }
            console.error('Supabase error assigning organization to user:', error);
            throw new common_1.InternalServerErrorException('No se pudo asignar la organización al usuario');
        }
        if (!data) {
            throw new common_1.NotFoundException('Usuario no encontrado');
        }
        return this.toPublicUser(data);
    }
    async updateProfile(id, changes) {
        const updatePayload = {};
        if (changes.name) {
            updatePayload.name = changes.name;
        }
        if (Object.keys(updatePayload).length === 0) {
            return this.findById(id);
        }
        const { data, error } = await this.supabase
            .from(this.tableName)
            .update(updatePayload)
            .eq('id', id)
            .select('*')
            .maybeSingle();
        if (error) {
            throw new common_1.InternalServerErrorException('No se pudo actualizar el perfil');
        }
        if (!data) {
            throw new common_1.NotFoundException('Usuario no encontrado');
        }
        return this.toPublicUser(data);
    }
    async removeOrganization(id) {
        const { data: existingUser, error: existingUserError } = await this.supabase
            .from(this.tableName)
            .select('id, role, organization_id')
            .eq('id', id)
            .maybeSingle();
        if (existingUserError) {
            console.error('Supabase error fetching user before removing organization:', existingUserError);
            throw new common_1.InternalServerErrorException('No se pudo verificar el usuario antes de quitar la organización');
        }
        if (!existingUser) {
            throw new common_1.NotFoundException('Usuario no encontrado');
        }
        const currentRole = existingUser.role ?? roles_enum_1.UserRole.User;
        const updatePayload = {
            organization_id: null,
            updated_at: new Date().toISOString(),
        };
        const { data, error } = await this.supabase
            .from(this.tableName)
            .update(updatePayload)
            .eq('id', id)
            .select('*')
            .maybeSingle();
        if (error) {
            console.error('Supabase error removing organization from user:', error);
            throw new common_1.InternalServerErrorException('No se pudo quitar la organización del usuario');
        }
        if (!data) {
            throw new common_1.NotFoundException('Usuario no encontrado');
        }
        return this.toPublicUser(data);
    }
    async changePassword(id, currentPassword, newPassword) {
        const { data, error } = await this.supabase
            .from(this.tableName)
            .select('*')
            .eq('id', id)
            .maybeSingle();
        if (error) {
            throw new common_1.InternalServerErrorException('No se pudo obtener el usuario');
        }
        if (!data) {
            throw new common_1.NotFoundException('Usuario no encontrado');
        }
        const userRow = data;
        const isValid = await bcrypt.compare(currentPassword, userRow.password_hash ?? '');
        if (!isValid) {
            throw new common_1.BadRequestException('La contraseña actual no es correcta');
        }
        const hashedPassword = await bcrypt.hash(newPassword, 12);
        const { error: updateError } = await this.supabase
            .from(this.tableName)
            .update({ password_hash: hashedPassword })
            .eq('id', id);
        if (updateError) {
            throw new common_1.InternalServerErrorException('No se pudo actualizar la contraseña');
        }
    }
    async remove(id) {
        const target = await this.supabase
            .from(this.tableName)
            .select('id, email')
            .eq('id', id)
            .maybeSingle();
        if (target.error) {
            console.error('Error obteniendo usuario antes de eliminar:', target.error);
            throw new common_1.InternalServerErrorException('No se pudo preparar la eliminación del usuario');
        }
        if (!target.data) {
            throw new common_1.NotFoundException('Usuario no encontrado');
        }
        const userEmail = target.data.email;
        await this.cleanupUserRelations(id, userEmail);
        const { data, error } = await this.supabase
            .from(this.tableName)
            .delete()
            .eq('id', id)
            .select('id')
            .maybeSingle();
        if (error) {
            console.error('Error eliminando usuario en Supabase:', error);
            throw new common_1.BadRequestException(this.resolveUserDeleteError(error));
        }
        if (!data) {
            throw new common_1.NotFoundException('Usuario no encontrado');
        }
    }
    async cleanupUserRelations(userId, userEmail) {
        await Promise.all([
            this.executeCleanup(this.supabase
                .from('organizations')
                .update({ owner: null })
                .eq('owner', userId), 'organizations.resetOwner'),
            this.executeCleanup(this.supabaseData
                .from('organizations')
                .update({ owner: null })
                .eq('owner', userId), 'organizationsData.resetOwner'),
        ]);
        await this.cleanupClientRelations(this.supabaseData, 'data', userId, { userEmail, removeUserRecord: true });
        await this.cleanupClientRelations(this.supabase, 'primary', userId, { removeUserRecord: false });
    }
    async cleanupClientRelations(client, label, userId, options) {
        const dashboardIds = await this.collectIds(client
            .from('dashboards')
            .select('id')
            .eq('owner_id', userId), `dashboards.fetchIds.${label}`);
        const datasetIds = await this.collectIds(client
            .from('datasets')
            .select('id')
            .eq('owner_id', userId), `datasets.fetchIds.${label}`);
        const inventoryItemIds = await this.collectIds(client
            .from('inventory_items')
            .select('id')
            .eq('owner_id', userId), `inventory_items.fetchIds.${label}`);
        if (dashboardIds.length > 0) {
            await this.executeCleanup(client
                .from('dashboard_datasets')
                .delete()
                .in('dashboard_id', dashboardIds), `dashboard_datasets.removeByDashboard.${label}`);
            await this.executeCleanup(client
                .from('dashboard_shares')
                .delete()
                .in('dashboard_id', dashboardIds), `dashboard_shares.removeByDashboard.${label}`);
        }
        await this.executeCleanup(client
            .from('dashboard_shares')
            .delete()
            .eq('owner_id', userId), `dashboard_shares.removeByOwner.${label}`);
        await this.executeCleanup(client
            .from('issues')
            .delete()
            .eq('owner_id', userId), `issues.removeByOwner.${label}`);
        await this.executeCleanup(client
            .from('inventory_adjustments')
            .delete()
            .eq('owner_id', userId), `inventory_adjustments.removeByOwner.${label}`);
        await this.executeCleanup(client
            .from('inventory_items')
            .delete()
            .eq('owner_id', userId), `inventory_items.removeByOwner.${label}`);
        if (inventoryItemIds.length > 0) {
            await this.executeCleanup(client
                .from('issues')
                .update({ inventory_item_id: null })
                .in('inventory_item_id', inventoryItemIds), `issues.detachInventory.${label}`);
            await this.executeCleanup(client
                .from('issues')
                .delete()
                .in('inventory_item_id', inventoryItemIds), `issues.removeByInventory.${label}`);
        }
        await this.executeCleanup(client
            .from('inventory_items')
            .update({ approved_by: null, approved_at: null })
            .eq('approved_by', userId), `inventory_items.clearApprover.${label}`);
        await this.executeCleanup(client
            .from('dashboards')
            .update({ approved_by: null, approved_at: null })
            .eq('approved_by', userId), `dashboards.clearApprover.${label}`);
        await this.executeCleanup(client
            .from('sales_order_items')
            .delete()
            .eq('owner_id', userId), `sales_order_items.removeByOwner.${label}`);
        await this.executeCleanup(client
            .from('sales_orders')
            .delete()
            .eq('owner_id', userId), `sales_orders.removeByOwner.${label}`);
        await this.executeCleanup(client
            .from('customers')
            .delete()
            .eq('owner_id', userId), `customers.removeByOwner.${label}`);
        if (datasetIds.length > 0) {
            await this.executeCleanup(client
                .from('inventory_adjustments')
                .delete()
                .in('dataset_id', datasetIds), `inventory_adjustments.removeByDataset.${label}`);
            await this.executeCleanup(client
                .from('inventory_items')
                .delete()
                .in('dataset_id', datasetIds), `inventory_items.removeByDataset.${label}`);
        }
        await this.executeCleanup(client
            .from('dashboards')
            .delete()
            .eq('owner_id', userId), `dashboards.removeByOwner.${label}`);
        await this.executeCleanup(client
            .from('datasets')
            .delete()
            .eq('owner_id', userId), `datasets.removeByOwner.${label}`);
        if (options.removeUserRecord) {
            if (options.userEmail) {
                await this.executeCleanup(client
                    .from('users')
                    .delete()
                    .eq('email', options.userEmail), `data_users.removeByEmail.${label}`);
            }
            else {
                await this.executeCleanup(client
                    .from('users')
                    .delete()
                    .eq('id', userId), `data_users.removeById.${label}`);
            }
        }
    }
    async collectIds(operation, context) {
        try {
            const { data, error } = await operation;
            if (error && !this.isIgnorableCleanupError(error)) {
                console.warn(`No se pudieron recopilar identificadores (${context}):`, error);
                return [];
            }
            return (data ?? []).map((row) => row.id);
        }
        catch (error) {
            console.warn(`Fallo inesperado recopilando identificadores (${context}):`, error);
            return [];
        }
    }
    async executeCleanup(operation, context) {
        try {
            const { error } = await operation;
            if (error && !this.isIgnorableCleanupError(error)) {
                console.warn(`No se pudo limpiar completamente (${context}). Requiere revisión manual.`, error);
            }
        }
        catch (error) {
            console.warn(`Fallo inesperado durante la limpieza (${context}).`, error);
        }
    }
    isIgnorableCleanupError(error) {
        if (!error) {
            return true;
        }
        const ignorableCodes = new Set([
            'PGRST116',
            'PGRST114',
            'PGRST106',
            'PGRST100',
            '42P01',
            '42703',
            '42501',
        ]);
        return ignorableCodes.has(error.code ?? '');
    }
    resolveUserDeleteError(error) {
        if (error.code === '23503') {
            const tableMatch = /on table "([^"]+)"/i.exec(error.message ?? '');
            const constraintMatch = /constraint "([^"]+)"/i.exec(error.message ?? '');
            const tableHint = tableMatch ? ` en la tabla "${tableMatch[1]}"` : '';
            const constraintHint = constraintMatch ? ` (restricción ${constraintMatch[1]})` : '';
            const detail = error.details ? ` Detalle: ${error.details}` : '';
            return `No se puede eliminar el usuario porque tiene datos asociados${tableHint}${constraintHint}. Elimina o reasigna esas referencias e inténtalo nuevamente.${detail}`.trim();
        }
        if (error.code === '42501') {
            return 'No tienes permisos suficientes para completar la eliminación. Verifica la configuración de Supabase.';
        }
        return 'No se pudo eliminar el usuario porque aún existen referencias activas en la plataforma. Revisa datasets, dashboards, inventario e incidencias relacionados.';
    }
    toPublicUser(row) {
        const entity = this.toUserEntity(row);
        const { passwordHash, ...rest } = entity;
        return rest;
    }
    toUserEntity(row) {
        return {
            id: row.id,
            email: row.email,
            name: row.name,
            role: row.role,
            passwordHash: row.password_hash,
            approved: row.approved,
            organizationId: row.organization_id ?? undefined,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(supabase_constants_1.SUPABASE_CLIENT)),
    __param(1, (0, common_1.Inject)(supabase_constants_1.SUPABASE_DATA_CLIENT)),
    __metadata("design:paramtypes", [supabase_js_1.SupabaseClient,
        supabase_js_1.SupabaseClient])
], UsersService);
//# sourceMappingURL=users.service.js.map